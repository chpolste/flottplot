.PHONY: dist clean test docs
.SECONDARY:


dist: \
	dist/flottplot-min.js \
	dist/flottplot-scan-min.js \
	dist/flottplot.css

clean:
	rm -rf deps
	rm -rf dist
	rm -rf docs/*.html
	rm -rf docs/*.css
	rm -rf docs/dist
	rm -rf docs/plot
	rm -rf test/flottplot.js
	rm -rf test/format_cases.json

%/:
	mkdir -p $@

init:
	npm install --include dev
	pip install -r docs/requirements.txt


# Flottplot modules

dist/%.css: src/%.less | dist/
	npx lessc $< > $@

# Building a bundle with webpack:
# - bundle js file depends on its corresponding ts file only
# - ts file dependencies are auto-generated
# - webpack won't overwrite the js file if it's content hasn't changed,
#   touching it anyway after successful compilation ensures that make
#   recognizes the update
dist/%-min.js: src/bundles/%.ts | dist/ deps/
	python3 util/generate_dependencies.py $< > deps/$*.mk
	npx webpack build \
		--entry-reset \
		--entry "./$<" \
		--output-filename "$(notdir $@)" \
		&& touch $@

# Auto-generated dependencies for bundle files
-include deps/*.mk


# Unit tests

TESTS := $(wildcard test/test_*.js)

test: test/flottplot.js test/format_cases.json $(TESTS)
	npx mocha $(TESTS)

test/format_cases.json: util/generate_format_cases.py | test/
	python3 $< > $@

test/flottplot.js: src/bundles/flottplot-test.ts | deps/
	python3 util/generate_dependencies.py $< > deps/flottplot-test.mk
	npx webpack build \
		--entry-reset \
		--entry "./$<" \
		--output-library-type "commonjs2" \
		--output-path "test" \
		--output-filename "flottplot.js" \
		&& touch $@


# Documentation

DOCS_HTML := \
	docs/html/ \
	docs/html/index.html \
	docs/html/tutorial.html \
	docs/html/elements.html \
	docs/html/values.html \
	docs/html/python.html \
	docs/html/docs.css \
	docs/html/convert.js \
	docs/html/dist/flottplot-min.js \
	docs/html/dist/flottplot.css \
	docs/html/dist/flottplot-scan-min.js \
	docs/html/plot/sin-1x.png \
	docs/html/plot/sin-2x.png \
	docs/html/plot/sin-3x.png \
	docs/html/plot/cos-3x.png \
	docs/html/plot/cos-2x.png \
	docs/html/plot/cos-3x.png \
	docs/html/plot/adv_fwd_000.png \
	docs/html/plot/adv_bwd_000.png \
	docs/html/plot/adv_lag_000.png

docs: $(DOCS_HTML)

docs/html/%.css: docs/src/%.less
	npx lessc $< $@

docs/html/%.html: docs/util/build.py docs/src/template.html docs/src/%.html
	python3 $+ > $@

docs/html/dist/%: dist/% | docs/html/dist/
	cp $^ $@

docs/html/plot/sin-%x.png: docs/util/plot-trigonometric.py | docs/html/plot/
	python3 $< "sin" $* $@

docs/html/plot/cos-%x.png: docs/util/plot-trigonometric.py | docs/html/plot/
	python3 $< "cos" $* $@

docs/html/plot/adv_%_000.png: docs/util/plot-advection.py | docs/html/plot/
	python3 $< $* $(dir $@)

