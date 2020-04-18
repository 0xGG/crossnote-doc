import { ThemeOptions, Theme, createMuiTheme } from "@material-ui/core";

type PreviewTheme = "github-light" | "github-dark";
type CodeBlockTheme =
  | "auto"
  | "atom-dark"
  | "atom-light"
  | "atom-material"
  | "coy"
  | "darcula"
  | "dark"
  | "default"
  | "funky"
  | "github"
  | "hopscotch"
  | "monokai"
  | "okaidia"
  | "one-dark"
  | "one-light"
  | "pen-paper-coffee"
  | "pojoaque"
  | "solarized-dark"
  | "solarized-light"
  | "twilight"
  | "vs"
  | "vue"
  | "xonokai";

interface CrossnoteThemeProps {
  name: string;
  muiThemeOptions: ThemeOptions;
  previewTheme: PreviewTheme;
  codeBlockTheme: CodeBlockTheme;
}

export class CrossnoteTheme {
  public name: string;
  public muiTheme: Theme;
  constructor({ name, muiThemeOptions }: CrossnoteThemeProps) {
    this.muiTheme = createMuiTheme(muiThemeOptions);
  }
}
