import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("app.tsx", { id: "app" }, [
        route("login", "routes/login.tsx"),
        route("register", "routes/register.tsx"),
        layout("layout.tsx", { id: "layout" }, [
            index("routes/home.tsx"),
            route("activity", "routes/activity.tsx")
        ])
    ])
] satisfies RouteConfig;
