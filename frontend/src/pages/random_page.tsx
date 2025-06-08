import Loading from "../components/loading.tsx";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import { network } from "../network/network.ts";
import showToast from "../components/toast.ts";

export default function RandomPage() {
  const navigate = useNavigate();

  useEffect(() => {
    network.getRandomResource().then((res) => {
      if (res.success) {
        navigate(`/resources/${res.data!.id}`, {
          state: {
            resource: res.data,
          },
        });
      } else {
        showToast({
          type: "error",
          message: res.message || "Failed to fetch random resource",
        });
      }
    });
  }, [navigate]);

  return <Loading />;
}
