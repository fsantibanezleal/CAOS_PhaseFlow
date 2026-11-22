# Manuscript depth: design

The manuscript checker measures authored LaTeX at the document boundary. In particular, an abstract may contain generated
values or zero-argument macros whose printed text is longer than their source spelling. The gate expands the document's own
zero-argument definitions, counts printed numbers and values, and applies separate floors to the technical report and method
manuscripts. It does not infer scientific quality from word count; the remaining section, method, evidence and review rules
continue to apply independently.

The product adopts the implementation from Product Template 0.15.014 verbatim. The abstract floors are 200–300 words for a
technical report and 150–250 words for a method manuscript, as specified by the CAOS manuscript content bar.
