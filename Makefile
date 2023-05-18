WEBPACK_MODE := "production"

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

%/:
	mkdir -p $@


# Flottplot modules

dist/%.css: src/%.less | dist/
	npx lessc $< > $@

dist/%-min.js: src/bundles/%.ts | dist/
	npx webpack build --entry-reset --entry "./$<" --mode "$(WEBPACK_MODE)" --output-filename "$(notdir $@)"

# TODO: ts file dependencies


# TODO: Unit tests
#
#TESTS := $(wildcard test/test_*.js)
#
#test: $(TESTS) test/flottplot.js test/format_cases.json
#	mocha test/*.js
#
#test/flottplot.ts: dist/flottplot.ts test/exports.ts | test/
#	cat $^ > $@
#
#test/flottplot.js: test/flottplot.ts | test/
#	tsc $(TS_CONFIG) --module "commonjs" $<
#
#test/format_cases.json: util/generate_format_cases.py | test/
#	python3 $< > $@


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

