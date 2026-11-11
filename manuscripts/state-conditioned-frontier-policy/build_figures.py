"""Build the manuscript's vector diagrams from frozen training and diagnostic records."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Circle
import numpy as np

INK = "#172B3A"
BLUE = "#176B87"
TEAL = "#2A8C82"
GOLD = "#D79222"
RED = "#B84444"
PALE = "#EFF5F7"
MID = "#AFC4CE"


def box(ax, xy, width, height, title, body="", color=BLUE, fill=PALE, fontsize=10):
    patch = FancyBboxPatch(
        xy, width, height, boxstyle="round,pad=0.02,rounding_size=0.04",
        linewidth=1.5, edgecolor=color, facecolor=fill,
    )
    ax.add_patch(patch)
    ax.text(xy[0] + width / 2, xy[1] + height * 0.68, title, ha="center", va="center",
            color=INK, fontsize=fontsize, fontweight="bold")
    if body:
        ax.text(xy[0] + width / 2, xy[1] + height * 0.34, body, ha="center", va="center",
                color=INK, fontsize=fontsize - 1.5, linespacing=1.25)


def arrow(ax, start, end, color=INK, style="-|>"):
    ax.add_patch(FancyArrowPatch(start, end, arrowstyle=style, mutation_scale=13,
                                 linewidth=1.5, color=color, connectionstyle="arc3,rad=0"))


def save(fig, out: Path, name: str):
    fig.savefig(out / f"{name}.pdf", bbox_inches="tight", facecolor="white")
    plt.close(fig)


def diagram_decision_cycle(out: Path):
    fig, ax = plt.subplots(figsize=(11, 2.7))
    ax.set(xlim=(0, 11), ylim=(0, 2.7)); ax.axis("off")
    items = [(0.2, "Graph + case", "precedence, values,\nresources", BLUE),
             (2.35, "Encode", "node messages +\ncurrent state", BLUE),
             (4.5, "Mask", "eligible and within\nremaining capacity", TEAL),
             (6.65, "Choose", "block or explicit\nstop action", GOLD),
             (8.8, "Validate", "constraints, NPV,\ncoverage", RED)]
    for x, title, body, color in items:
        box(ax, (x, 0.65), 1.8, 1.35, title, body, color=color)
    for x in [2.02, 4.17, 6.32, 8.47]: arrow(ax, (x, 1.32), (x + 0.3, 1.32))
    arrow(ax, (7.55, 0.54), (2.9, 0.54), color=MID, style="<->")
    ax.text(5.2, 0.25, "repeat after each assignment or period transition", ha="center", color=INK, fontsize=9)
    save(fig, out, "decision-cycle")


def diagram_architecture(out: Path):
    fig, ax = plt.subplots(figsize=(10, 4.3))
    ax.set(xlim=(0, 10), ylim=(0, 4.3)); ax.axis("off")
    box(ax, (0.2, 2.55), 2.0, 1.2, "Static graph", "7 node features\nprecedence edges", color=BLUE)
    box(ax, (0.2, 0.55), 2.0, 1.2, "Dynamic state", "period, capacity,\nvalue, frontier", color=TEAL)
    box(ax, (3.1, 2.55), 2.1, 1.2, "Graph encoder", "2 message-passing\nlayers, width 64", color=BLUE)
    box(ax, (3.1, 0.55), 2.1, 1.2, "State encoder", "pooled graph +\nstate vector", color=TEAL)
    box(ax, (6.0, 2.55), 1.6, 1.2, "Block actor", "one logit\nper block", color=GOLD)
    box(ax, (6.0, 0.55), 1.6, 1.2, "Stop actor", "period /\nschedule", color=GOLD)
    box(ax, (8.15, 1.55), 1.6, 1.2, "Masked action", "ensemble logits\nthen argmax", color=RED)
    for s,e in [((2.22,3.15),(3.05,3.15)),((2.22,1.15),(3.05,1.15)),
                ((5.25,3.15),(5.95,3.15)),((5.25,1.15),(5.95,1.15)),
                ((7.65,3.05),(8.1,2.4)),((7.65,1.15),(8.1,1.9))]: arrow(ax,s,e)
    arrow(ax,(8.95,1.5),(2.2,0.45),color=MID)
    ax.text(5.7,0.08,"assignment updates state; static graph embeddings are reused",ha="center",fontsize=9,color=INK)
    save(fig,out,"architecture")


def diagram_mask(out: Path):
    fig, ax = plt.subplots(figsize=(8, 5.4))
    ax.set(xlim=(0, 8), ylim=(0, 5.4)); ax.axis("off")
    pos={0:(1,4.15),1:(3,4.15),2:(5,4.15),3:(3,2.0),4:(6.5,2.0)}
    edges=[(0,1),(1,2),(1,3),(2,4)]
    for u,v in edges: arrow(ax,(pos[u][0]+.25,pos[u][1]-.1),(pos[v][0]-.25,pos[v][1]+.1),color=MID)
    labels={0:"A · assigned",1:"B · eligible",2:"C · eligible",3:"D · waits for C",4:"E · capacity blocked"}
    colors={0:TEAL,1:BLUE,2:BLUE,3:RED,4:RED}
    for node,(x,y) in pos.items():
        circ=Circle((x,y),.42,facecolor=PALE,edgecolor=colors[node],linewidth=2); ax.add_patch(circ)
        ax.text(x,y,str(node),ha="center",va="center",fontweight="bold",color=INK)
        ax.text(x,y-.56,labels[node],ha="center",va="top",fontsize=9,color=colors[node])
    box(ax,(.5,.18),2.7,.62,"Current capacity","remaining resource vector",color=TEAL,fontsize=8)
    box(ax,(4.35,.18),3.1,.62,"Mask result","{B, C, stop-period, stop-schedule}",color=GOLD,fontsize=8)
    ax.set_title("A precedence edge and a resource check remove different actions",color=INK,fontweight="bold",pad=8)
    save(fig,out,"mask-example")


def diagram_split(out: Path):
    fig, ax = plt.subplots(figsize=(9, 3.4))
    ax.set_xlim(0, 10); ax.set_ylim(0, 3.4); ax.axis("off")
    specs=[(0.3,2.25,2.6,"Train","1,000 graphs","policy updates",BLUE),
           (3.7,2.25,2.0,"Validation","200 graphs","checkpoint selection",TEAL),
           (6.6,2.25,2.9,"Synthetic test","500 graphs","opened once; outputs lost",RED)]
    for x,w,h,t,b,c,col in specs: box(ax,(x,.95),w,1.5,t,b+"\n"+c,color=col)
    arrow(ax,(3.0,1.7),(3.6,1.7)); arrow(ax,(5.8,1.7),(6.5,1.7))
    ax.text(4.95,.35,"Seed and graph-family separation; test partition remains consumed",ha="center",fontsize=9,color=INK)
    save(fig,out,"split-design")


def diagram_evidence(out: Path):
    fig, ax = plt.subplots(figsize=(10, 3.5))
    ax.set(xlim=(0,10),ylim=(0,3.5)); ax.axis("off")
    steps=[(0.25,"Training","complete","5 capped members",BLUE),(2.75,"Validation","diagnostic","200 cases reused",GOLD),
           (5.25,"Test","unavailable","500 outputs lost",RED),(7.75,"Product cases","unopened","13 cases untouched",RED)]
    for x,title,status,detail,color in steps:
        box(ax,(x,.95),2.0,1.55,title,f"{status}\n{detail}",color=color)
    for x in [2.3,4.8,7.3]: arrow(ax,(x,1.7),(x+.4,1.7),color=MID)
    ax.text(5,0.3,"Only training and validation diagnostics survived; no independent performance result exists",ha="center",fontsize=9,color=INK)
    save(fig,out,"evidence-boundary")


def diagram_failure(out: Path):
    fig, ax = plt.subplots(figsize=(9,3.2))
    ax.set(xlim=(0,9),ylim=(0,3.2)); ax.axis("off")
    box(ax,(.3,1),2.2,1.35,"Evaluation loop","500 cases processed\nin memory",color=BLUE)
    box(ax,(3.35,1),2.2,1.35,"Final serializer","exception before\nper-case persistence",color=RED)
    box(ax,(6.4,1),2.2,1.35,"Surviving record","split consumed;\nall rows unavailable",color=GOLD)
    arrow(ax,(2.55,1.68),(3.3,1.68)); arrow(ax,(5.6,1.68),(6.35,1.68))
    ax.text(4.5,.35,"In-memory execution is not an auditable result artifact",ha="center",fontsize=9,color=INK)
    save(fig,out,"failure-path")


def plot_validation_history(out: Path, receipt: dict):
    fig, ax = plt.subplots(figsize=(7.6, 4.2))
    colors=[BLUE,TEAL,GOLD,RED,"#6257A5"]
    for member,color in zip(receipt["members"],colors,strict=False):
        hist=member.get("validation_history",[])
        if hist:
            x=[row["transitions"] for row in hist]
            y=[row["mean_normalized_npv"] for row in hist]
            ax.plot(x,y,marker="o",linewidth=1.6,markersize=5,label=f"seed {member['seed']}",color=color)
    ax.set_xlabel("Training transitions at validation event")
    ax.set_ylabel("Mean normalized NPV")
    ax.set_title("Checkpoint-selection validation history",color=INK,fontweight="bold")
    ax.grid(True,alpha=.25); ax.legend(frameon=False,ncol=2)
    fig.tight_layout(); save(fig,out,"validation-history")


def plot_validation_replay(out: Path, diagnostic: dict):
    fig,(left,right)=plt.subplots(1,2,figsize=(9,4.2),gridspec_kw={"width_ratios":[1,1.4]})
    left.bar(["nonempty"],[diagnostic["nonempty_schedule_fraction"]],color=BLUE,width=.55)
    left.set_ylim(0,1); left.set_ylabel("Fraction of validation cases")
    left.set_title("Schedule completion",color=INK,fontweight="bold")
    left.text(0,diagnostic["nonempty_schedule_fraction"]+.04,
              f"{diagnostic['nonempty_schedule_fraction']:.0%}",ha="center",color=INK,fontweight="bold")
    vals=[diagnostic["median_positive_value_coverage"],diagnostic["max_positive_value_coverage"]]
    right.bar(["median","maximum"],vals,color=[TEAL,GOLD],width=.55)
    right.set_ylim(0,max(.12, max(vals)*1.25)); right.set_ylabel("Positive-value coverage")
    right.set_title("Coverage on reused validation cases",color=INK,fontweight="bold")
    for i,v in enumerate(vals): right.text(i,v+.003,f"{v:.1%}",ha="center",color=INK,fontweight="bold")
    fig.suptitle("Post-selection diagnostic, not independent evaluation",color=RED,fontweight="bold")
    fig.tight_layout(); save(fig,out,"validation-replay")


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--training-receipt",type=Path,required=True)
    parser.add_argument("--diagnostic",type=Path,required=True)
    parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args()
    receipt=json.loads(args.training_receipt.read_text(encoding="utf-8"))
    diagnostic=json.loads(args.diagnostic.read_text(encoding="utf-8"))
    if diagnostic.get("partition")!="validation" or diagnostic.get("interpretation","").find("not independent")<0:
        raise ValueError("the replay figure requires an explicitly validation-only diagnostic")
    if diagnostic.get("training_source_commit")!=receipt.get("source_commit"):
        raise ValueError("training and validation diagnostic source commits differ")
    args.out.mkdir(parents=True,exist_ok=True)
    plt.rcParams.update({"font.family":"DejaVu Sans","font.size":10,"axes.labelcolor":INK,
                         "xtick.color":INK,"ytick.color":INK,"text.color":INK,"pdf.fonttype":42})
    diagram_decision_cycle(args.out)
    diagram_architecture(args.out)
    diagram_mask(args.out)
    diagram_split(args.out)
    diagram_evidence(args.out)
    diagram_failure(args.out)
    plot_validation_history(args.out,receipt)
    plot_validation_replay(args.out,diagnostic)


if __name__=="__main__":
    main()
