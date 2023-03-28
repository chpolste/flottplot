from collections import abc
from functools import singledispatch
import datetime


@singledispatch
def as_value(value):
    return str(value)

@as_value.register(datetime.date)
def _(value):
    return value.strftime("%Y-%m-%d")

@as_value.register(datetime.datetime)
def _(value):
    return value.strftime("%Y-%m-%d %H:%M:%S")

@as_value.register(datetime.timedelta)
def _(value):
    value = value.total_seconds()
    number, unit = int(value), "s"
    if number != value:
        raise ValueError("Flottplot does not support sub-second resolution")
    if number % 60 == 0:
        number, unit = number // 60, "m"
    if number % 60 == 0:
        number, unit = number // 60, "h"
    if number % 24 == 0:
        number, unit = number // 24, "d"
    return f"{number}{unit}"


class Element:
    
    INDENT_INCREMENT = 2
    
    def __init__(self, name, **attributes):
        self.name = name
        self.children = []
        self.attributes = attributes
    
    def appendChild(self, child):
        self.children.append(child)
        return self # allow method chaining
    
    def __setitem__(self, key, value):
        self.attributes[key] = value;
        
    def as_html(self, indent=0):
        spaces = " " * indent
        attributes = ""
        for key, value in self.attributes.items():
            value = as_value(value)
            attributes += f' {key}="{value}"'
        # One-line tag if no children
        if len(self.children) == 0:
            return f"{spaces}<{self.name}{attributes}></{self.name}>"
        # One-line tag also if there is only one text child
        if len(self.children) == 1 and not isinstance(self.children[0], Element):
            text = as_value(self.children[0])
            return f"{spaces}<{self.name}{attributes}>{text}</{self.name}>"
        # Multi-line tag
        lines = []
        lines.append(f"{spaces}<{self.name}{attributes}>")
        for child in self.children:
            if isinstance(child, Element):
                lines.append(child.as_html(indent + self.INDENT_INCREMENT))
            else:
                lines.append(spaces + (" " * self.INDENT_INCREMENT) + as_value(child))
        lines.append(f"{spaces}</{self.name}>")
        return "\n".join(lines)
    
    def __str__(self):
        return self.as_html()
    
    def __repr__(self):
        return self.as_html()


@singledispatch
def convert(x):
    raise NotImplementedError()

@convert.register(abc.Iterable)
def _(xs, **attrs):
    out = Element("fp-select", **attrs)
    for x in xs:
        out.appendChild(Element("fp-option").appendChild(x))
    return out

@convert.register(range)
def _(rng, **attrs):
    out = Element("fp-range", **attrs)
    out["min"] = rng.start
    out["step"] = rng.step
    # Python's range is right-exclusive, Flottplot's is inclusive
    out["max"] = rng.stop - rng.step
    return out

@convert.register(abc.Mapping)
def _(dct, **attrs):
    out = Element("fp-select", **attrs)
    for key, value in dct.items():
        out.appendChild(Element("fp-option", value=value).appendChild(key))
    return out

