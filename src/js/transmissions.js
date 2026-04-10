(function() {
  var feed = document.getElementById('transmission-feed');
  if (!feed) return;

  var CACHE_KEY = 'eam_transmissions_cache';
  var CACHE_TTL = 24 * 60 * 60 * 1000;
  var BLOG_FEED_URL = 'https://eric.mann.blog/feed/';
  var MASTODON_LOOKUP = 'https://tekton.network/api/v1/accounts/lookup?acct=ericmann';
  var CHAR_DELAY = 30;

  function stripHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || '').trim();
  }

  function truncate(str, len) {
    if (str.length <= len) return str;
    return str.substring(0, len).replace(/\s+\S*$/, '') + '…';
  }

  function formatDate(dateStr) {
    try {
      var d = new Date(dateStr);
      return d.toISOString().split('T')[0];
    } catch (e) { return dateStr; }
  }

  // ── Cache ──
  function getCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function setCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
    } catch (e) { /* storage full or unavailable */ }
  }

  function isCacheValid(cache) {
    return cache && cache.timestamp && (Date.now() - cache.timestamp < CACHE_TTL);
  }

  // ── Fetch blog RSS ──
  function fetchBlog() {
    return fetch(BLOG_FEED_URL)
      .then(function(res) {
        if (!res.ok) throw new Error('Blog feed: ' + res.status);
        return res.text();
      })
      .then(function(text) {
        var parser = new DOMParser();
        var xml = parser.parseFromString(text, 'text/xml');
        var item = xml.querySelector('item');
        if (!item) return null;
        var title = item.querySelector('title');
        var link = item.querySelector('link');
        var pubDate = item.querySelector('pubDate');
        var desc = item.querySelector('description');
        return {
          source: 'blog',
          title: title ? title.textContent : 'Untitled',
          url: link ? link.textContent : '#',
          date: pubDate ? formatDate(pubDate.textContent) : '',
          excerpt: desc ? truncate(stripHtml(desc.textContent), 140) : ''
        };
      });
  }

  // ── Fetch Mastodon ──
  function fetchMastodon() {
    return fetch(MASTODON_LOOKUP)
      .then(function(res) {
        if (!res.ok) throw new Error('Mastodon lookup: ' + res.status);
        return res.json();
      })
      .then(function(account) {
        var statusUrl = 'https://tekton.network/api/v1/accounts/' +
          account.id + '/statuses?limit=4&exclude_replies=true&exclude_reblogs=true';
        return fetch(statusUrl);
      })
      .then(function(res) {
        if (!res.ok) throw new Error('Mastodon statuses: ' + res.status);
        return res.json();
      })
      .then(function(statuses) {
        return statuses.map(function(s) {
          return {
            source: 'mastodon',
            content: truncate(stripHtml(s.content), 280),
            url: s.url || s.uri,
            date: formatDate(s.created_at)
          };
        });
      });
  }

  // ── Typewriter renderer ──
  function typeText(element, text, callback) {
    var i = 0;
    element.textContent = '';
    var cursor = document.createElement('span');
    cursor.className = 'tx-cursor';
    element.appendChild(cursor);

    function tick() {
      if (i < text.length) {
        cursor.insertAdjacentText('beforebegin', text[i]);
        i++;
        setTimeout(tick, CHAR_DELAY);
      } else {
        if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
        if (callback) callback();
      }
    }
    tick();
  }

  function buildBlogItem(post) {
    var item = document.createElement('div');
    item.className = 'tx-item';

    var source = document.createElement('div');
    source.className = 'tx-source';
    source.textContent = '// blog';

    var date = document.createElement('div');
    date.className = 'tx-date';
    date.textContent = post.date;

    var content = document.createElement('div');
    content.className = 'tx-content';

    var link = document.createElement('a');
    link.href = post.url;
    link.target = '_blank';
    link.className = 'tx-title-link';

    var linkBottom = document.createElement('a');
    linkBottom.href = post.url;
    linkBottom.target = '_blank';
    linkBottom.className = 'tx-link';
    linkBottom.textContent = 'read more ▸';

    item.appendChild(source);
    item.appendChild(date);
    item.appendChild(content);
    content.appendChild(link);
    item.appendChild(linkBottom);

    return { el: item, typeTo: link, text: post.title, excerpt: post.excerpt, contentEl: content };
  }

  function buildMastodonItem(post) {
    var item = document.createElement('div');
    item.className = 'tx-item';

    var source = document.createElement('div');
    source.className = 'tx-source mastodon';
    source.textContent = '// mastodon';

    var date = document.createElement('div');
    date.className = 'tx-date';
    date.textContent = post.date;

    var content = document.createElement('div');
    content.className = 'tx-content';

    var linkBottom = document.createElement('a');
    linkBottom.href = post.url;
    linkBottom.target = '_blank';
    linkBottom.className = 'tx-link';
    linkBottom.textContent = 'view post ▸';

    item.appendChild(source);
    item.appendChild(date);
    item.appendChild(content);
    item.appendChild(linkBottom);

    return { el: item, typeTo: content, text: post.content };
  }

  function renderFeed(data, cached) {
    feed.innerHTML = '';
    var items = [];

    if (data.blog) {
      items.push(buildBlogItem(data.blog));
    }
    if (data.mastodon && data.mastodon.length) {
      data.mastodon.forEach(function(post) {
        items.push(buildMastodonItem(post));
      });
    }

    if (items.length === 0) {
      feed.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.7rem;letter-spacing:2px;color:var(--text-dim);text-align:center;">// signal lost — transmissions unavailable</p>';
      return;
    }

    items.forEach(function(item) {
      feed.appendChild(item.el);
    });

    if (cached) {
      var note = document.createElement('p');
      note.style.cssText = 'font-family:var(--font-mono);font-size:0.55rem;letter-spacing:2px;color:var(--text-dim);text-align:center;margin-top:0.5rem;';
      note.textContent = '(cached)';
      feed.appendChild(note);
    }

    typeAll(items);
  }

  function typeAll(items) {
    items.forEach(function(item) {
      var delay = Math.floor(Math.random() * 800);
      setTimeout(function() {
        typeText(item.typeTo, item.text, function() {
          if (item.excerpt) {
            var excerptEl = document.createElement('p');
            excerptEl.style.cssText = 'font-size:0.85rem;color:var(--text-dim);margin-top:0.4rem;';
            item.contentEl.appendChild(excerptEl);
            typeText(excerptEl, item.excerpt);
          }
        });
      }, delay);
    });
  }

  // ── Main ──
  var cache = getCache();
  if (isCacheValid(cache)) {
    renderFeed(cache.data, false);
  } else {
    var blogP = fetchBlog().catch(function() { return null; });
    var mastoP = fetchMastodon().catch(function() { return []; });

    Promise.all([blogP, mastoP]).then(function(results) {
      var data = { blog: results[0], mastodon: results[1] };

      if (!data.blog && (!data.mastodon || data.mastodon.length === 0)) {
        if (cache && cache.data) {
          renderFeed(cache.data, true);
        } else {
          feed.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.7rem;letter-spacing:2px;color:var(--text-dim);text-align:center;">// signal lost — transmissions unavailable</p>';
        }
        return;
      }

      setCache(data);
      renderFeed(data, false);
    });
  }
})();
