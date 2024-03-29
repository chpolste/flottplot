import html
import os
import re
import subprocess
import sys
import warnings

from flottplot import __version__

regex_h1 = re.compile(r"\<h1[^\>]*id=\"(.*)\"[^\>]*\>(.*)\</h1\>") # only h1 with id set
regex_h2 = re.compile(r"\<h2[^\>]*id=\"(.*)\"[^\>]*\>(.*)\</h2\>") # only h2 with id set

regex_content = re.compile(r"^\s*\<!--\s*content\s*--\>\s*$")
regex_navigation = re.compile(r"^\s*\<!--\s*navigation\s*--\>\s*$")
regex_title = re.compile(r"\<!--\s*title\s*--\>")
regex_version = re.compile(r"\<!--\s*version\s*--\>")

def template_substitute(template, source):
    assert os.path.isfile(template)
    assert os.path.isfile(source)
    title = os.path.splitext(os.path.basename(source))[0]
    title = title.replace("_", " ").capitalize()
    headings = collect_headings(source)
    navigation = make_navigation(headings)
    with open(template, "r") as tmp:
        for line_tmp in tmp:
            match = regex_content.match(line_tmp)
            if match is not None:
                with open(source, "r") as src:
                    for line_src in src:
                        content_substitute(line_src, end="")
                continue
            match = regex_navigation.match(line_tmp)
            if match is not None:
                print(navigation)
                continue
            line_tmp = re.sub(regex_title, title, line_tmp)
            line_tmp = re.sub(regex_version, __version__, line_tmp)
            print(line_tmp, end="")


regex_shell = re.compile(r"^\<!--\s*\$\s+(.*)\s*--\>$")

def content_substitute(line, **print_kwargs):
    # To auto-generate parts of the documentation of the python package,
    # execute subcommands of the CLI interface, capture the output of the
    # subcommand help and substitute into the document.
    match = regex_shell.match(line)
    if match is not None:
        text = subprocess.getoutput(match.group(1))
        print(html.escape(text))
        return
    print(line, **print_kwargs)


def collect_headings(source):
    refs = set() # collect to warn about duplicates
    headings = []
    with open(source, "r") as src:
        for line_src in src:
            # Top-level heading
            match = regex_h1.match(line_src)
            if match is not None:
                ref = match.group(1)
                txt = match.group(2)
                headings.append([{ "lvl": "h1", "ref": ref, "txt": txt }])
                if ref in refs:
                    warnings.warn(f"duplicate reference {ref} in '{line_src.strip()}'")
                refs.add(ref)
            # Sub-heading
            match = regex_h2.match(line_src)
            if match is not None:
                ref = match.group(1)
                txt = match.group(2)
                headings[-1].append([{ "lvl": "h2", "ref": ref, "txt": txt }])
                if ref in refs:
                    warnings.warn(f"duplicate reference {ref} in '{line_src.strip()}'")
                refs.add(ref)
    return headings


def make_navigation(headings):
    if not headings:
        return ""
    navigation = []
    navigation.append("<ul>")
    for heading in headings:
        navigation.append("<li>")
        if isinstance(heading, dict):
            navigation.append(make_link(heading))
        else:
            navigation.append(make_link(heading[0]))
            navigation.append(make_navigation(heading[1:]))
        navigation.append("</li>")
    navigation.append("</ul>")
    return "".join(navigation)


def make_link(heading):
    return '<a href="#{ref}">{txt}</a>'.format(**heading)


if __name__ == "__main__":
    assert len(sys.argv) == 3
    _, template, source = sys.argv

    template_substitute(template, source)

