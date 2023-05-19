.PHONY: dist clean test docs
.SECONDARY:


dist: \
	dist/flottplot-min.js \
	dist/flottplot-scan-min.js \
	dist/flottplot.css

clean:
	rm -rf dist
	rm -rf docs/*.html
	rm -rf docs/*.css
	rm -rf docs/dist
	rm -rf docs/plot
	rm -rf test/flottplot.js
	rm -rf test/format_cases.json

%/:
	mkdir -p $@


# Flottplot modules

dist/%.css: src/%.less | dist/
	npx lessc $< > $@

dist/%-min.js: src/bundles/%.ts | dist/
	npx webpack build \
		--entry-reset \
	    --entry "./$<" \
		--output-filename "$(notdir $@)"

# TODO: ts file dependencies


# Unit tests

TESTS := $(wildcard test/test_*.js)

test: test/flottplot.js test/format_cases.json $(TESTS)
	npx mocha $(TESTS)

test/format_cases.json: util/generate_format_cases.py | test/
	python3 $< > $@

test/flottplot.js: src/bundles/flottplot-test.ts
	npx webpack build \
		--entry-reset \
		--entry "./$<" \
		--output-library-type "commonjs2" \
		--output-path "test" \
		--output-filename "flottplot.js"


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

