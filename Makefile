.PHONY: all test documentation clean

MODULE := src/module.js src/dom.js src/core.js src/elements.js


all: \
	dist/flottplot.js \
	dist/flottplot-scan.js \
	dist/flottplot-min.js \
	dist/flottplot-scan-min.js \
	dist/flottplot-extras.js \
	dist/flottplot-extras-min.js \
	dist/flottplot-extras.css

documentation: \
	docs/.nojekyll \
	docs/index.html \
	docs/values.html \
	docs/core.html \
	docs/extras.html \
	docs/tips.html \
	docs/docs.css \
	docs/dist/flottplot-min.js \
	docs/dist/flottplot-scan-min.js \
	docs/dist/flottplot-extras-min.js \
	docs/dist/flottplot-extras.css

test: tests/tests.js
	mocha $^

clean:
	rm -rf docs
	rm -rf dist
	rm -rf tests


# Distribution files

dist/%-min.js: dist/%.js
	uglifyjs $^ > $@

dist/flottplot.js: $(MODULE) | dist
	python3 tools/preprocessor.py src/module.js > $@

dist/flottplot-scan.js: $(MODULE) src/scan.js | dist
	python3 tools/preprocessor.py src/scan.js > $@

dist/flottplot-%.js: src/%/module.js src/%/elements.js | dist
	python3 tools/preprocessor.py $< > $@

dist/flottplot-%.css: src/%/style.css | dist
	lessc $< > $@

dist:
	mkdir -p dist


# Documentation files

docs/docs.css: src/docs/docs.less | docs
	lessc $< $@

docs/%.html: src/docs/%.html src/docs/template.html tools/docbuilder.py | docs
	python3 tools/docbuilder.py src/docs/template.html $< > $@

docs/dist/%: dist/% | docs/dist
	cp $^ $@

docs/.nojekyll:
	touch $@

docs:
	mkdir -p docs

docs/dist:
	mkdir -p docs/dist


# Unit tests

tests/tests.js: src/tests.js src/core.js tests/value-testcases.json
	python3 tools/preprocessor.py $< > $@

tests/value-testcases.json: tools/format-testcase-generator.py | tests
	python3 tools/format-testcase-generator.py > $@

tests:
	mkdir -p tests

