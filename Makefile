.PHONY: all test documentation clean

MODULE := src/module.js src/dom.js src/core.js src/elements.js


all: \
	dist/flottplot.js \
	dist/flottplot.css \
	dist/flottplot-scan.js \
	dist/flottplot-min.js \
	dist/flottplot-scan-min.js \
	python/flottplot/assets/flottplot-min.js \
	python/flottplot/assets/flottplot-scan-min.js \
	python/flottplot/assets/flottplot.css

documentation: \
	docs/.nojekyll \
	docs/logo.svg \
	docs/favicon.png \
	docs/index.html \
	docs/tutorial.html \
	docs/elements.html \
	docs/values.html \
	docs/python.html \
	docs/docs.css \
	docs/dist/flottplot-min.js \
	docs/dist/flottplot.css \
	docs/dist/flottplot-scan-min.js \
	docs/plot/cos-1x.png \
	docs/plot/cos-2x.png \
	docs/plot/cos-3x.png \
	docs/plot/sin-1x.png \
	docs/plot/sin-2x.png \
	docs/plot/sin-3x.png

test: tests/tests.js
	mocha $^

clean:
	rm -rf docs
	rm -rf dist
	rm -rf tests
	rm -rf python/flottplot/assets


# Distribution files

dist/%-min.js: dist/%.js
	uglifyjs $^ > $@

dist/flottplot.css: src/style.less | dist
	lessc $< > $@

dist/flottplot.js: $(MODULE) | dist
	python3 tools/preprocessor.py src/module.js > $@

dist/flottplot-scan.js: $(MODULE) src/scan.js | dist
	python3 tools/preprocessor.py src/scan.js > $@

dist/flottplot-%.js: src/%/module.js src/%/elements.js | dist
	python3 tools/preprocessor.py $< > $@

dist/flottplot-%.css: src/%/style.less | dist
	lessc $< > $@

dist:
	mkdir -p dist


# Python package files

python/flottplot/assets/%: dist/% | python/flottplot/assets
	cp $< $@

python/flottplot/assets:
	mkdir -p $@


# Documentation files

docs/%: src/docs/%
	cp $^ $@

docs/%.css: src/docs/%.less | docs
	lessc $< $@

docs/%.html: src/docs/%.html src/docs/template.html tools/docbuilder.py | docs
	python3 tools/docbuilder.py src/docs/template.html $< > $@

docs/dist/%: dist/% | docs/dist
	cp $^ $@

docs/.nojekyll: | docs
	touch $@

docs/plot/sin-%x.png: tools/plot-trigonometric.py | docs/plot
	python3 $< "sin" $* $@

docs/plot/cos-%x.png: tools/plot-trigonometric.py | docs/plot
	python3 $< "cos" $* $@

docs:
	mkdir -p docs

docs/dist:
	mkdir -p docs/dist

docs/plot:
	mkdir -p docs/plot


# Unit tests

tests/tests.js: src/tests.js src/core.js tests/value-testcases.json
	python3 tools/preprocessor.py $< > $@

tests/value-testcases.json: tools/format-testcase-generator.py | tests
	python3 tools/format-testcase-generator.py > $@

tests:
	mkdir -p tests

