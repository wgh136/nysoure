import {FormEvent, useState} from "react";
import {network} from "../network/network.ts";
import {app} from "../app.ts";
import {useNavigate} from "react-router";
import {useTranslation} from "react-i18next";

export default function LoginPage() {
  const {t} = useTranslation();
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username || !password) {
      setError(t("Username and password cannot be empty"));
      return;
    }
    setLoading(true);
    const res = await network.login(username, password);
    if (res.success) {
      app.user = res.data!;
      app.token = res.data!.token;
      app.saveData();
      navigate("/", {replace: true});
    } else {
      setError(res.message);
      setLoading(false);
    }
  };

  return <div className={"flex items-center justify-center w-full h-full bg-base-200"} id={"login-page"}>
    <div className={"w-96 card card-border bg-base-100 border-base-300"}>
      <form onSubmit={onSubmit}>
        <div className={"card-body"}>
          <h1 className={"text-2xl font-bold"}>{t("Login")}</h1>
          {error && <div role="alert" className="alert alert-error my-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none"
                   viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>{error}</span>
          </div>}
          <fieldset className="fieldset w-full">
            <legend className="fieldset-legend">{t("Username")}</legend>
            <input type="text" className="input w-full" value={username} onChange={(e) => setUsername(e.target.value)}/>
          </fieldset>
          <fieldset className="fieldset w-full">
            <legend className="fieldset-legend">{t("Password")}</legend>
            <input type="password" className="input w-full" value={password} onChange={(e) => setPassword(e.target.value)}/>
          </fieldset>
          <button className={"btn my-4 btn-primary"} type={"submit"}>
            {isLoading && <span className="loading loading-spinner"></span>}
            {t("Continue")}
          </button>
          <button className="btn" type={"button"} onClick={() => {
            navigate("/register", {replace: true});
          }}>
            {t("Don't have an account? Register")}
          </button>
        </div>
      </form>
    </div>
  </div>
}
