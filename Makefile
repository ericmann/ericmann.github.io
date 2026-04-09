.PHONY: build serve clean

build:
	node build.js

serve:
	node watch.js

clean:
	rm -rf dist
