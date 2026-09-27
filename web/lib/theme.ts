import { createTheme, type MantineColorsTuple } from "@mantine/core";

const tide: MantineColorsTuple = [
  "#FFF4DC",
  "#8ED0E4",
  "#8ED0E4",
  "#186878",
  "#186878",
  "#1C262A",
  "#1C262A",
  "#143848",
  "#0C3140",
  "#0C3140",
];

const field = {
  backgroundColor: "var(--surface)",
  color: "var(--text)",
  borderColor: "var(--line)",
  borderRadius: "var(--radius)",
  fontWeight: 300,
};

export const theme = createTheme({
  primaryColor: "tide",
  primaryShade: 6,
  white: "#FFF4DC",
  black: "#1C262A",
  fontFamily: "var(--font-source), sans-serif",
  fontSizes: { md: "1rem" },
  headings: {
    fontFamily: "var(--font-source), sans-serif",
    fontWeight: "200",
  },
  defaultRadius: "sm",
  radius: {
    xs: "0.35rem",
    sm: "var(--radius)",
    md: "0.65rem",
    lg: "0.85rem",
    xl: "1.1rem",
  },
  colors: { tide },
  components: {
    Button: {
      styles: {
        root: {
          backgroundColor: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          fontWeight: 300,
        },
      },
    },
    TextInput: {
      styles: {
        label: { color: "var(--on-bg)", fontWeight: 300 },
        input: field,
      },
    },
    PasswordInput: {
      styles: {
        label: { color: "var(--on-bg)", fontWeight: 300 },
        input: field,
        innerInput: { color: "var(--text)", fontWeight: 300 },
      },
    },
    NativeSelect: {
      styles: {
        label: { color: "var(--on-bg)", fontWeight: 300 },
        input: field,
      },
    },
    Alert: {
      styles: {
        root: {
          backgroundColor: "var(--mark)",
          color: "var(--on-mark)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--line)",
        },
        message: { color: "var(--on-mark)", fontWeight: 300 },
      },
    },
  },
});
