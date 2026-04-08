.PHONY: build serve clean

build:
	node build.js

serve: build
	cd dist && python3 -m http.server 8000

clean:
	rm -rf dist
