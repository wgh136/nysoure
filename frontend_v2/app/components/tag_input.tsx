import type { Tag } from "../network/models";
import { useRef, useState } from "react";
import { useTranslation } from "../hook/i18n";
import { network } from "../network/network";
import { LuInfo } from "react-icons/lu";
import { MdSearch } from "react-icons/md";
import Button from "./button";
import Input, { TextArea } from "./input";
import { ErrorAlert } from "./alert";
import { Debounce } from "../utils/debounce";

export default function TagInput({
  onAdd,
  mainTag,
}: {
  onAdd: (tag: Tag) => void;
  mainTag?: boolean;
}) {
  const [keyword, setKeyword] = useState<string>("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);

  const debounce = useRef(new Debounce(500));

  const { t } = useTranslation();

  const searchTags = async (keyword: string) => {
    if (keyword.length === 0) {
      return;
    }
    setLoading(true);
    setTags([]);
    setError(null);
    const res = await network.searchTags(keyword, mainTag);
    if (!res.success) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setTags(res.data!);
    setLoading(false);
  };

  const handleChange = async (v: string) => {
    setKeyword(v);
    setTags([]);
    setError(null);
    if (v.length !== 0) {
      setLoading(true);
      debounce.current.run(() => searchTags(v));
    } else {
      setLoading(false);
      debounce.current.cancel();
    }
  };

  const handleCreateTag = async (name: string) => {
    setLoading(true);
    const res = await network.createTag(name);
    if (!res.success) {
      setError(res.message);
      setLoading(false);
      return;
    }
    onAdd(res.data!);
    setKeyword("");
    setTags([]);
    setLoading(false);
    const input = document.getElementById(
      "search_tags_input",
    ) as HTMLInputElement;
    input.blur();
  };

  let dropdownContent;
  if (error) {
    dropdownContent = (
      <div className="alert alert-error my-2">
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
    );
  } else if (!keyword) {
    dropdownContent = (
      <div className="flex flex-row py-2 px-4">
        <LuInfo size={20} />
        <span className={"w-2"} />
        <span className={"flex-1"}>{t("Please enter a search keyword")}</span>
      </div>
    );
  } else if (isLoading) {
    dropdownContent = (
      <div className="flex flex-row py-2 px-4">
        <span className={"loading loading-spinner loading-sm"}></span>
        <span className={"w-2"} />
        <span className={"flex-1"}>{t("Searching...")}</span>
      </div>
    );
  } else {
    const haveExactMatch = tags.find((t) => t.name === keyword) !== undefined;
    dropdownContent = (
      <>
        {tags.map((t) => {
          return (
            <li
              key={t.id}
              onClick={() => {
                onAdd(t);
                setKeyword("");
                setTags([]);
                const input = document.getElementById(
                  "search_tags_input",
                ) as HTMLInputElement;
                input.blur();
              }}
            >
              <a>
                <span>{t.name}</span>
                {t.type && (
                  <span className="badge badge-secondary badge-sm ml-2 text-xs">
                    {t.type}
                  </span>
                )}
              </a>
            </li>
          );
        })}
        {!haveExactMatch && (
          <li
            onClick={() => {
              handleCreateTag(keyword);
            }}
          >
            <a>
              {t("Create Tag")}: {keyword}
            </a>
          </li>
        )}
      </>
    );
  }

  return (
    <div className={"dropdown dropdown-end"}>
      <label className="input w-64">
        <MdSearch size={18} />
        <input
          autoComplete={"off"}
          id={"search_tags_input"}
          tabIndex={0}
          type="text"
          className="grow"
          placeholder={t("Search Tags")}
          value={keyword}
          onChange={(e) => handleChange(e.target.value)}
        />
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-1 w-64 p-2 shadow mt-2 border border-base-300"
      >
        {dropdownContent}
      </ul>
    </div>
  );
}

export function QuickAddTagDialog({
  onAdded,
}: {
  onAdded: (tags: Tag[]) => void;
}) {
  const { t } = useTranslation();

  const [text, setText] = useState<string>("");

  const [type, setType] = useState<string>("");

  const [error, setError] = useState<string | null>(null);

  const [separator, setSeparator] = useState<string>(" ");

  const [isLoading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (isLoading) {
      return;
    }
    if (text.trim().length === 0) {
      return;
    }
    setError(null);
    let sep: string | RegExp = separator;
    if (sep === " ") {
      sep = /\s+/;
    }
    const names = text.split(sep).filter((n) => n.length > 0);
    setLoading(true);
    const res = await network.getOrCreateTags(names, type);
    setLoading(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    const tags = res.data!;
    onAdded(tags);
    setText("");
    setType("");
    const dialog = document.getElementById(
      "quick_add_tag_dialog",
    ) as HTMLDialogElement;
    dialog.close();
  };

  return (
    <>
      <Button
        className={"btn-soft btn-primary"}
        onClick={() => {
          const dialog = document.getElementById(
            "quick_add_tag_dialog",
          ) as HTMLDialogElement;
          dialog.showModal();
        }}
      >
        {t("Quick Add")}
      </Button>
      <dialog id="quick_add_tag_dialog" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t("Add Tags")}</h3>
          <p className="py-2 text-sm">
            {t("Input tags separated by separator.")}
            <br />
            {t("If the tag does not exist, it will be created automatically.")}
            <br />
            {t("Optionally, you can specify a type for the new tags.")}
          </p>
          <p className={"flex my-2"}>
            <span className={"flex-1"}>{t("Separator")}:</span>
            <label className="label text-sm mx-2">
              <input
                type="radio"
                name="radio-1"
                className="radio radio-primary"
                checked={separator == ","}
                onChange={() => setSeparator(",")}
              />
              Comma
            </label>
            <label className="label text-sm mx-2">
              <input
                type="radio"
                name="radio-2"
                className="radio radio-primary"
                checked={separator == ";"}
                onChange={() => setSeparator(";")}
              />
              Semicolon
            </label>
            <label className="label text-sm mx-2">
              <input
                type="radio"
                name="radio-3"
                className="radio radio-primary"
                checked={separator == " "}
                onChange={() => setSeparator(" ")}
              />
              Space
            </label>
          </p>
          <TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            label={"Tags"}
          />
          <Input
            value={type}
            onChange={(e) => setType(e.target.value)}
            label={"Type"}
          />
          {error && <ErrorAlert className={"mt-2"} message={error} />}
          <div className="modal-action">
            <form method="dialog">
              <Button className="btn">{t("Cancel")}</Button>
            </form>
            <Button
              isLoading={isLoading}
              className={"btn-primary"}
              disabled={text === ""}
              onClick={handleSubmit}
            >
              {t("Submit")}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
