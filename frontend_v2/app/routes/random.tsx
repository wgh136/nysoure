import { useEffect } from "react";
import { useNavigate } from "react-router";
import { network } from "~/network/network";
import Loading from "~/components/loading";
import type { Route } from "./+types/random";
import { configFromMatches } from "~/hook/config";

export function meta({ matches }: Route.MetaArgs) {
  const config = configFromMatches(matches);
  return [
    { title: config.server_name },
    { name: "description", content: config.site_description },
  ];
}

export default function RandomPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const loadRandomResource = async () => {
      const result = await network.getRandomResource();
      if (result.success && result.data) {
        navigate(`/resources/${result.data.id}`, { replace: true });
      } else {
        // If failed, go back to home
        navigate("/", { replace: true });
      }
    };

    loadRandomResource();
  }, [navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Loading />
    </div>
  );
}
