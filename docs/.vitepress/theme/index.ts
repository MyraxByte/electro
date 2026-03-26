import DefaultTheme from "vitepress/theme";
import Layout from "./Layout.vue";
import "./styles/vars.css";
import "./styles/plasma.css";
import "./styles/layout.css";
import "./styles/code.css";

export default {
    extends: DefaultTheme,
    Layout,
};
