import { type RouteConfig, index, layout } from "@react-router/dev/routes";

export default [
    layout("app.tsx", { id: "app" }, [
        layout("layout.tsx", { id: "layout" }, [
            index("routes/home.tsx")
        ])
    ])
] satisfies RouteConfig;
