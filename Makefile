.PHONY: all test docs clean
.SECONDARY:

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

test: tests/tests.js
	mocha $^

clean:
	rm -rf dist
	rm -rf tests
	rm -rf docs/*.html
	rm -rf docs/*.css
	rm -rf docs/dist
	rm -rf docs/plot
	rm -rf python/flottplot/assets

%/:
	mkdir -p $@


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


# Documentation

DOCS := \
	docs/ \
	docs/index.html \
	docs/tutorial.html \
	docs/elements.html \
	docs/values.html \
	docs/python.html \
	docs/docs.css \
	docs/dist/flottplot-min.js \
	docs/dist/flottplot.css \
	docs/dist/flottplot-scan-min.js \
	docs/plot/sin-1x.png \
	docs/plot/sin-2x.png \
	docs/plot/sin-3x.png \
	docs/plot/cos-3x.png \
	docs/plot/cos-2x.png \
	docs/plot/cos-3x.png \
	docs/plot/adv_fwd_000.png \
	docs/plot/adv_bwd_000.png \
	docs/plot/adv_lag_000.png

docs: $(DOCS)

docs/%.css: docs/src/%.less
	npx lessc $< $@

docs/%.html: docs/util/build.py docs/src/template.html docs/src/%.html
	python3 $+ > $@

docs/dist/%: dist/% | docs/dist/
	cp $^ $@

docs/plot/sin-%x.png: docs/util/plot-trigonometric.py | docs/plot/
	python3 $< "sin" $* $@

docs/plot/cos-%x.png: docs/util/plot-trigonometric.py | docs/plot/
	python3 $< "cos" $* $@

docs/plot/adv_%_000.png: docs/util/plot-advection.py | docs/plot/
	python3 $< $* $(dir $@)


# Unit tests

tests/tests.js: src/tests.js src/core.js tests/value-testcases.json
	python3 tools/preprocessor.py $< > $@

tests/value-testcases.json: tools/format-testcase-generator.py | tests
	python3 tools/format-testcase-generator.py > $@

tests:
	mkdir -p tests

