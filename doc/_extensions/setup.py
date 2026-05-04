"""Setup for BerryCrush Pygments lexer."""

from setuptools import setup

setup(
    name='berrycrush-lexer',
    version='0.1.0',
    py_modules=['berrycrush_lexer'],
    install_requires=['pygments>=2.0'],
    entry_points={
        'pygments.lexers': [
            'berrycrush = berrycrush_lexer:BerryCrushLexer',
        ],
    },
)
