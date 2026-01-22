import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("app.tsx", { id: "app" }, [
        route("login", "routes/login.tsx"),
        route("register", "routes/register.tsx"),
        layout("layout.tsx", { id: "layout" }, [
            index("routes/home.tsx"),
            route("activity", "routes/activity.tsx"),
            route("notifications", "routes/notifications.tsx"),
            route("random", "routes/random.tsx"),
            route("tags", "routes/tags.tsx"),
            route("tag/:name", "routes/tag.$name.tsx"),
            route("search", "routes/search.tsx"),
            route("about", "routes/about.tsx"),
            route("publish", "routes/publish.tsx"),
            route("resources/:id/edit", "routes/resources.$id.edit.tsx"),
            route("user/:username", "routes/user.$username.tsx"),
            route("collection/:id", "routes/collection.$id.tsx"),
            route("create-collection", "routes/create-collection.tsx"),
            route("comments/:id", "routes/comments.$id.tsx"),
            layout("routes/manage.tsx", [
                route("manage/me", "routes/manage.me.tsx"),
                route("manage/storage", "routes/manage.storage.tsx"),
                route("manage/users", "routes/manage.users.tsx"),
                route("manage/config", "routes/manage.config.tsx")
            ])
        ]),
    ])
] satisfies RouteConfig;
