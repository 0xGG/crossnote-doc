import { Box, Chip, Typography } from "@material-ui/core";
import {
  createStyles,
  makeStyles,
  Theme,
  useTheme,
} from "@material-ui/core/styles";
import { Skeleton } from "@material-ui/lab";
import clsx from "clsx";
import { TabNode } from "flexlayout-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import LazyLoad from "react-lazyload";
import { CrossnoteContainer } from "../containers/crossnote";
import { Note } from "../lib/note";
import { Notebook } from "../lib/notebook";
import { TabNodeConfig } from "../lib/tabNode";
import NoteCard, { NoteCardMargin } from "./NoteCard";
const is = require("is_js");

const lazyLoadPlaceholderHeight = 92 + 2 * NoteCardMargin;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    notesList: {
      "position": "relative",
      // "flex": "1",
      // "overflowY": "auto",
      "paddingTop": theme.spacing(2),
      "paddingLeft": theme.spacing(2),
      "paddingRight": theme.spacing(2),
      "paddingBottom": theme.spacing(12),
      [theme.breakpoints.down("sm")]: {
        paddingLeft: theme.spacing(0.5),
        paddingRight: theme.spacing(0.5),
      },

      "& .note-card-sizer": {
        // width: `${NoteCardWidth + 2 * NoteCardMargin}px`,
        maxWidth: "100%",
        /*
        [theme.breakpoints.down("xs")]: {
          width: "100%",
        },
        */
      },
    },
    updatePanel: {
      padding: theme.spacing(2),
      textAlign: "center",
      borderBottom: `1px solid ${theme.palette.divider}`,
      backgroundColor: theme.palette.background.paper,
    },
  }),
);

interface Props {
  tabNode: TabNode;
  referredNote?: Note;
  notebook: Notebook;
  notes: Note[];
  searchValue: string;
  scrollElement: HTMLElement;
}

export default function Notes(props: Props) {
  const classes = useStyles(props);
  const { t } = useTranslation();
  const theme = useTheme();
  const crossnoteContainer = CrossnoteContainer.useContainer();
  const [notes, setNotes] = useState<Note[]>([]);

  // Hack: fix note cards not displaying bug when searchValue is not empty
  const hack = useCallback(() => {
    if (props.scrollElement) {
      const scrollElement = props.scrollElement;
      const initialHeight = scrollElement.style.height;
      const initialFlex = scrollElement.style.flex;
      scrollElement.style.flex = "initial";
      scrollElement.style.height = "10px";
      scrollElement.scrollTop += 1;
      scrollElement.scrollTop -= 1;
      scrollElement.style.height = initialHeight;
      scrollElement.style.flex = initialFlex;
    }
  }, [props.scrollElement]);

  useEffect(() => {
    if (props.tabNode) {
      const tabNodeConfig: TabNodeConfig = props.tabNode.getConfig();
      if (
        (tabNodeConfig.component !== "Notes" &&
          tabNodeConfig.component !== "Note") ||
        tabNodeConfig.notebookPath !== props.notebook.dir
      ) {
        return;
      }

      props.tabNode.setEventListener("resize", hack);
      hack();
      return () => {
        props.tabNode.removeEventListener("resize");
      };
    }
  }, [props.tabNode, props.notebook.dir, hack]);

  useEffect(() => {
    const newNotes = props.notes;
    const searchValue = props.searchValue;
    const pinned: Note[] = [];
    const unpinned: Note[] = [];
    newNotes.forEach((note) => {
      // TODO: Convert to use MiniSearch for searching
      if (searchValue.trim().length) {
        const regexp = new RegExp(
          "(" +
            searchValue
              .trim()
              .split(/\s+/g)
              .map((s) => s.replace(/[.!@#$%^&*()_+\-=[\]]/g, (x) => `\\${x}`)) // escape special regexp characters
              .join("|") +
            ")",
          "i",
        );

        if (note.markdown.match(regexp) || note.filePath.match(regexp)) {
          if (note.config.pinned) {
            pinned.push(note);
          } else {
            unpinned.push(note);
          }
        }
      } else {
        if (note.config.pinned) {
          pinned.push(note);
        } else {
          unpinned.push(note);
        }
      }
    });

    const mergedNotes = [...pinned, ...unpinned];

    if (mergedNotes.length !== notes.length) {
      setNotes(mergedNotes);
      return;
    }

    mergedNotes.some((mergedNote, index) => {
      const note = notes[index];
      if (mergedNote.filePath !== note.filePath) {
        setNotes(mergedNotes);
        return true;
      }
      return false;
    });
  }, [props.notes, props.searchValue]);

  useEffect(() => {
    if (props.scrollElement) {
      window.addEventListener("resize", hack);
      hack();
      return () => {
        window.removeEventListener("resize", hack);
      };
    }
  }, [notes, props.scrollElement]);

  const notesComponent = useMemo(() => {
    return (notes || []).map((note) => {
      return (
        <LazyLoad
          key={"lazy-load-note-card-" + note.filePath}
          placeholder={
            <Box
              style={{
                maxWidth: "100%",
                margin: `${NoteCardMargin}px auto`,
                padding: theme.spacing(2, 0.5, 0),
                height: `${lazyLoadPlaceholderHeight}px`,
              }}
              className={"note-card lazyload-placeholder"}
            >
              <Skeleton />
              <Skeleton animation={false} />
              <Skeleton animation="wave" />
            </Box>
          }
          height={lazyLoadPlaceholderHeight}
          overflow={true}
          once={true}
          scrollContainer={props.scrollElement}
          resize={true}
        >
          <NoteCard
            key={"note-card-" + note.filePath}
            tabNode={props.tabNode}
            note={note}
            referredNote={props.referredNote}
          ></NoteCard>
        </LazyLoad>

        //   <NoteCard key={"note-card-" + note.filePath} note={note}></NoteCard>
      );
    });
  }, [notes, props.referredNote, props.scrollElement, props.tabNode]);

  return (
    <React.Fragment>
      <Box style={{ textAlign: "center" }}>
        <Chip
          size={"small"}
          variant={"outlined"}
          color={"default"}
          label={`${Object.keys(notes).length} ${t("profile-card/notes")}`}
        ></Chip>
      </Box>
      <div className={clsx(classes.notesList)}>
        {notesComponent}
        {crossnoteContainer.initialized &&
          props.notebook.hasLoadedNotes &&
          notes.length === 0 && (
            <Typography
              style={{
                textAlign: "center",
                marginTop: "32px",
              }}
              variant={"body2"}
              color={"textPrimary"}
            >
              {"🧐 " + t("general/no-notes-found")}
            </Typography>
          )}
      </div>
    </React.Fragment>
  );
}
