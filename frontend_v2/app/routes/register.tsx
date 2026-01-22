import { type FormEvent, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router";
import { translationFromMatches, useTranslation } from "~/hook/i18n";
import { configFromMatches, useConfig } from "~/hook/config";
import { network } from "~/network/network";
import type { Route } from "./+types/register";

// Lazy load Turnstile component only when needed
const Turnstile = lazy(() =>
  import("@marsidev/react-turnstile").then((mod) => ({ default: mod.Turnstile }))
);

export function meta({ matches}: Route.MetaArgs) {
  const config = configFromMatches(matches);
  const { t } = translationFromMatches(matches);
  return [{ title: t("Register") + " | " + config.server_name }];
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cfToken, setCfToken] = useState("");

  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (import.meta.env.CLOUDFLARE_TURNSTILE_SITE_KEY && !cfToken) {
      setError(t("Please complete the captcha"));
      return;
    }
    if (!username || !password) {
      setError(t("Username and password cannot be empty"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("Passwords do not match"));
      return;
    }
    setLoading(true);
    const res = await network.register(username, password, cfToken);
    if (res.success) {
      // Cookie is automatically set by the server, just reload to update state
      window.location.href = "/";
    } else {
      setError(res.message);
      setLoading(false);
    }
  };

  return (
    <div
      className={"flex items-center justify-center w-full h-full min-h-screen bg-base-200"}
      id={"register-page"}
    >
      <div className={"w-96 card card-border bg-base-100 border-base-300"}>
        <form onSubmit={onSubmit}>
          <div className={"card-body"}>
            <h1 className={"text-2xl font-bold"}>{t("Register")}</h1>
            {error && (
              <div role="alert" className="alert alert-error my-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 shrink-0 stroke-current"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}
            <fieldset className="fieldset w-full">
              <legend className="fieldset-legend">{t("Username")}</legend>
              <input
                type="text"
                className="input w-full"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </fieldset>
            <fieldset className="fieldset w-full">
              <legend className="fieldset-legend">{t("Password")}</legend>
              <input
                type="password"
                className="input w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </fieldset>
            <fieldset className="fieldset w-full">
              <legend className="fieldset-legend">
                {t("Confirm Password")}
              </legend>
              <input
                type="password"
                className="input w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </fieldset>
            {import.meta.env.CLOUDFLARE_TURNSTILE_SITE_KEY && (
              <Suspense fallback={<div className="skeleton h-16 w-full"></div>}>
                <Turnstile
                  siteKey={import.meta.env.CLOUDFLARE_TURNSTILE_SITE_KEY}
                  onSuccess={setCfToken}
                  onExpire={() => setCfToken("")}
                />
              </Suspense>
            )}
            <button className={"btn my-4 btn-primary"} type={"submit"}>
              {isLoading && <span className="loading loading-spinner"></span>}
              {t("Continue")}
            </button>
            <button
              className="btn"
              type={"button"}
              onClick={() => {
                navigate("/login", { replace: true });
              }}
            >
              {t("Already have an account? Login")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
