import { debounce } from "@0xgg/echomd";
import { Box, Typography } from "@material-ui/core";
import {
  createStyles,
  makeStyles,
  Theme,
  useTheme,
} from "@material-ui/core/styles";
import clsx from "clsx";
import * as d3 from "d3";
import { TabNode } from "flexlayout-react";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CrossnoteContainer } from "../containers/crossnote";
import {
  ChangedNoteFilePathEventData,
  CreatedNoteEventData,
  DeletedNotebookEventData,
  DeletedNoteEventData,
  EventType,
  globalEmitter,
  ModifiedMarkdownEventData,
  PerformedGitOperationEventData,
} from "../lib/event";
import {
  constructGraphView,
  GraphViewData,
  GraphViewNode,
} from "../lib/graphView";
import { Notebook } from "../lib/notebook";

const bottomPanelHeight = 20;
const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    graphViewPanel: {
      width: "100%",
      height: "100%",
      /*
      "& .tooltip": {
        position: "absolute",
        width: "200px",
        backgroundColor: fade(theme.palette.grey[700], 0.9),
        borderRadius: theme.shape.borderRadius,
        color: theme.palette.common.white,
        fontFamily: theme.typography.fontFamily,
        padding: "4px 8px",
        fontSize: theme.typography.pxToRem(10),
        lineHeight: `${round(14 / 10)}em`,
        maxWidth: 300,
        wordWrap: "break-word",
        fontWeight: theme.typography.fontWeightMedium,
      },
      */
    },
    graphView: {
      position: "relative",
      height: `calc(100% - ${bottomPanelHeight}px)`,
      display: "block",
    },
    bottomPanel: {
      position: "absolute",
      bottom: "0",
      width: "100%",
      padding: theme.spacing(0.5, 1),
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      maxHeight: `${bottomPanelHeight}px`,
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.getContrastText(theme.palette.primary.main),
    },
    filePath: {
      wordBreak: "break-all",
    },
  }),
);

interface Props {
  notebook: Notebook;
  tabNode: TabNode;
}

export default function GraphView(props: Props) {
  const classes = useStyles();
  const [graphViewData, setGraphViewData] = useState<GraphViewData>({
    hash: "",
    nodes: [],
    links: [],
  });
  const graphView = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [hoveredGraphViewNode, setHoveredGraphViewNode] = useState<
    GraphViewNode
  >(null);
  const { t } = useTranslation();
  const crossnoteContainer = CrossnoteContainer.useContainer();
  const theme = useTheme();

  useEffect(() => {
    if (!graphView || !graphView.current || !props.tabNode) {
      return;
    }
    const resize = () => {
      setWidth(graphView.current.offsetWidth);
      setHeight(graphView.current.offsetHeight);
    };
    const debouncedResize = debounce(resize, 1000);
    window.addEventListener("resize", debouncedResize);
    props.tabNode.setEventListener("resize", debouncedResize);
    resize();

    return () => {
      window.removeEventListener("resize", debouncedResize);
      props.tabNode.removeEventListener("resize");
    };
  }, [graphView, props.tabNode]);

  useEffect(() => {
    if (!graphView || !props.notebook) {
      return;
    }

    const refreshGraphViewData = () => {
      // TODO: Improve the diff
      const newGraphViewData = constructGraphView(props.notebook);
      if (newGraphViewData.hash !== graphViewData.hash) {
        setGraphViewData(newGraphViewData);
      }
    };

    const modifiedMarkdownCallback = (data: ModifiedMarkdownEventData) => {
      if (data.notebookPath === props.notebook.dir) {
        refreshGraphViewData();
      }
    };
    const createdNoteCallback = (data: CreatedNoteEventData) => {
      if (data.notebookPath === props.notebook.dir) {
        refreshGraphViewData();
      }
    };
    const deletedNoteCallback = (data: DeletedNoteEventData) => {
      if (data.notebookPath === props.notebook.dir) {
        refreshGraphViewData();
      }
    };
    const changedNoteFilePathCallback = (
      data: ChangedNoteFilePathEventData,
    ) => {
      if (data.notebookPath === props.notebook.dir) {
        refreshGraphViewData();
      }
    };
    const performedGitOperationCallback = (
      data: PerformedGitOperationEventData,
    ) => {
      if (data.notebookPath === props.notebook.dir) {
        refreshGraphViewData();
      }
    };
    const deletedNotebookCallback = (data: DeletedNotebookEventData) => {
      if (data.notebookPath === props.notebook.dir) {
        crossnoteContainer.closeTabNode(props.tabNode.getId());
      }
    };

    globalEmitter.on(EventType.ModifiedMarkdown, modifiedMarkdownCallback);
    globalEmitter.on(EventType.CreatedNote, createdNoteCallback);
    globalEmitter.on(EventType.DeletedNote, deletedNoteCallback);
    globalEmitter.on(
      EventType.ChangedNoteFilePath,
      changedNoteFilePathCallback,
    );
    globalEmitter.on(
      EventType.PerformedGitOperation,
      performedGitOperationCallback,
    );
    globalEmitter.on(EventType.DeletedNotebook, deletedNotebookCallback);
    return () => {
      globalEmitter.off(EventType.ModifiedMarkdown, modifiedMarkdownCallback);
      globalEmitter.off(EventType.CreatedNote, createdNoteCallback);
      globalEmitter.off(EventType.DeletedNote, deletedNoteCallback);
      globalEmitter.off(
        EventType.ChangedNoteFilePath,
        changedNoteFilePathCallback,
      );
      globalEmitter.off(
        EventType.PerformedGitOperation,
        performedGitOperationCallback,
      );
      globalEmitter.off(EventType.DeletedNotebook, deletedNotebookCallback);
    };
  }, [graphView, props.notebook, props.tabNode, graphViewData]);

  useEffect(() => {
    const data = constructGraphView(props.notebook);
    setGraphViewData(data);
  }, [props.notebook]);

  useEffect(() => {
    if (
      !graphView ||
      !graphView.current ||
      !graphViewData ||
      !width ||
      !height
    ) {
      return;
    }

    const svg = d3
      .select(graphView.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height);
    const container = svg.append("g");

    const zoomHandler = d3
      .zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", function (event: any) {
        console.log("zoomed");
        (window as any)["event_"] = event;
        container.attr("transform", event.transform);
      });
    zoomHandler(svg as any);

    const link = container
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(graphViewData.links)
      .enter()
      .append("line")
      .style("stroke", "#aaa")
      .attr("stroke-width", "1px");

    const node = container
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(graphViewData.nodes)
      .enter()
      .append("circle")
      .attr("r", 8)
      .style("fill", "#aaa");

    const text = container
      .append("g")
      .attr("class", "labelNodes")
      .selectAll("text")
      .data(graphViewData.nodes)
      .enter()
      .append("text")
      .text((d) => d.label)
      .style("fill", theme.palette.text.primary)
      .style("font-family", "Arial")
      .style("font-size", 12)
      .style("pointer-events", "none");

    /*
    // Define the div for the tooltip
    const tooltip = d3
      .select(graphView.current)
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
      */

    const fixna = (x: number) => {
      if (isFinite(x)) return x;
      return 0;
    };

    const neigh = (n1: GraphViewNode, n2: GraphViewNode) => {
      return props.notebook.referenceMap.hasRelation(n1.id, n2.id);
    };

    const focus = (event: any, d: GraphViewNode) => {
      node.style("opacity", function (o) {
        return neigh(d, o) ? 1 : 0.1;
      });
      text.attr("display", function (o) {
        return neigh(d, o) ? "block" : "none";
      });

      link.style("opacity", function (o) {
        return (o.source as any).id === d.id || (o.target as any).id === d.id
          ? 1
          : 0.2;
      });

      setHoveredGraphViewNode(d);

      /*
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(`${d.id}`)
        .style("left", event.offsetX + 32 + "px")
        .style("top", event.offsetY + 32 + "px")
        .style("opacity", 1);
        */
    };

    const unfocus = () => {
      text.attr("display", "block");
      node.style("opacity", 1);
      link.style("opacity", 1);
      setHoveredGraphViewNode(null);
      // tooltip.style("opacity", 0);
    };

    const dragstarted = function (event: any, d: any) {
      console.log("dragstarted: ", d.active);
      event.sourceEvent.stopPropagation();
      if (!d.active) graphLayout.alphaTarget(0.3).restart();

      // @ts-ignore
      d3.select(this).attr("stroke", "black");
    };

    const dragged = function (event: any, d: any) {
      console.log("dragged");
      d.x = event.x;
      d.y = event.y;
      // @ts-ignore
      d3.select(this as SVGCircleElement)
        .raise()
        .attr("transform", (d: any) => "translate(" + [d.x, d.y] + ")");
    };

    const dragended = function (event: any, d: any) {
      console.log("dragended");
      if (!d.active) graphLayout.alphaTarget(0);

      // @ts-ignore
      d3.select(this).attr("stroke", null);
    };

    const updateLink = (link: any) => {
      link
        .attr("x1", function (d: any) {
          return fixna(d.source.x);
        })
        .attr("y1", function (d: any) {
          return fixna(d.source.y);
        })
        .attr("x2", function (d: any) {
          return fixna(d.target.x);
        })
        .attr("y2", function (d: any) {
          return fixna(d.target.y);
        });
    };

    const updateNode = (node: any) => {
      node.attr("transform", function (d: any) {
        return "translate(" + fixna(d.x) + "," + fixna(d.y) + ")";
      });
    };
    const ticked = () => {
      // console.log("ticked");
      node.call(updateNode);
      link.call(updateLink);
      text.call(updateNode);
    };

    const graphLayout = d3
      .forceSimulation(graphViewData.nodes as any)
      .force("charge", d3.forceManyBody().strength(-3000))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(1))
      .force("y", d3.forceY(height / 2).strength(1))
      .force(
        "link",
        d3
          .forceLink(graphViewData.links)
          .id(function (d) {
            return (d as GraphViewNode).id;
          })
          .distance(50)
          .strength(1),
      )
      .on("tick", ticked);

    node.on("mouseover", focus).on("mouseout", unfocus);
    const drag = d3
      .drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
    drag(node as any);

    node.on("click", (event: any, d: GraphViewNode) => {
      crossnoteContainer.openNoteAtPath(props.notebook, d.id);
    });

    console.log("simulated");

    return () => {
      console.log("destroyed");
      svg.remove();
    };
  }, [
    graphViewData,
    graphView,
    width,
    height,
    props.notebook,
    theme.palette.text.primary,
  ]);

  return (
    <Box className={clsx(classes.graphViewPanel)}>
      <div className={clsx(classes.graphView)} ref={graphView}></div>
      {graphViewData && (
        <Box className={clsx(classes.bottomPanel, "editor-bottom-panel")}>
          <Typography variant={"caption"} className={clsx(classes.filePath)}>
            {hoveredGraphViewNode ? hoveredGraphViewNode.id : ""}
          </Typography>
          <Typography variant={"caption"} className={clsx(classes.filePath)}>
            {`${graphViewData.nodes.length} ${t("graph-view/node")}, ${
              graphViewData.links.length
            } ${t("graph-view/link")} `}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
