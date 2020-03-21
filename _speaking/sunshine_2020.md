---
conference: SunshinePHP
when: Feb 2020
date: 2020-02-06
title: Asynchronous Awesome - Task Management in PHP
link: https://speakerdeck.com/ericmann/asynchronous-awesome-1b7a5c08-f10c-4c80-b60c-554a7c3481e8 
---
Sometimes, our use of PHP grows beyond the typical request/response cycle of dynamic page generation. Unfortunately, the threaded nature of PHP - and the stateless nature of the server - betrays any efforts to expand our utilization of the server. Image processing, video rendering, APNS (Apple Push Notification Service) integration - any of these can easily take longer than is reasonable for a simple page request. Enter tools like message and job queues that empower daemonized PHP workers to handle data processing in the background. Yet further tools enable long-running event loops and asynchronous Promise-driven operations. PHP isn't multi-threaded, but that doesn't mean you're limited to a single-thread paradigm.

I demonstrate various use cases necessitating asynchronous operations, then delve into the code and the tools that make these systems work. Every attendee will leave armed with new ways to think about the management of large data jobs in PHP and an understanding of the tools they can use to make it happen.