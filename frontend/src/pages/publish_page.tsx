import { useEffect, useRef, useState } from "react";
import { MdAdd, MdDelete, MdOutlineInfo } from "react-icons/md";
import { Tag } from "../network/models.ts";
import { network } from "../network/network.ts";
import { LuInfo } from "react-icons/lu";
import { useNavigate } from "react-router";
import showToast from "../components/toast.ts";
import { useTranslation } from "react-i18next";
import { app } from "../app.ts";
import { ErrorAlert } from "../components/alert.tsx";

export default function PublishPage() {
  const [title, setTitle] = useState<string>("")
  const [altTitles, setAltTitles] = useState<string[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [article, setArticle] = useState<string>("")
  const [images, setImages] = useState<number[]>([])
  const [isUploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)

  const navigate = useNavigate()
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("Publish Resource");
  }, [])

  const handleSubmit = async () => {
    if (isSubmitting) {
      return
    }
    if (!title) {
      setError(t("Title cannot be empty"))
      return
    }
    for (let i = 0; i < altTitles.length; i++) {
      if (!altTitles[i]) {
        setError(t("Alternative title cannot be empty"))
        return
      }
    }
    if (!tags || tags.length === 0) {
      setError(t("At least one tag required"))
      return
    }
    if (!article) {
      setError(t("Description cannot be empty"))
      return
    }
    const res = await network.createResource({
      title: title,
      alternative_titles: altTitles,
      tags: tags.map((tag) => tag.id),
      article: article,
      images: images,
    })
    if (res.success) {
      setSubmitting(false)
      navigate("/resources/" + res.data!, { replace: true })
    } else {
      setSubmitting(false)
      setError(res.message)
    }
  }

  const addImage = () => {
    if (isUploading) {
      return
    }
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async () => {
      const files = input.files
      if (!files || files.length === 0) {
        return
      }
      const image = files[0]
      setUploading(true)
      const res = await network.uploadImage(image)
      if (res.success) {
        setUploading(false)
        setImages([...images, res.data!])
      } else {
        setUploading(false)
        showToast({ message: t("Failed to upload image"), type: "error" })
      }
    }
    input.click()
  }

  if (!app.user) {
    return <ErrorAlert className={"m-4"} message={t("You are not logged in. Please log in to access this page.")} />
  }

  if (!app.user?.is_admin) {
    return <ErrorAlert className={"m-4"} message={t("You are not authorized to access this page.")} />
  }

  return <div className={"p-4"}>
    <h1 className={"text-2xl font-bold my-4"}>{t("Publish Resource")}</h1>
    <div role="alert" className="alert alert-info mb-2 alert-dash">
      <MdOutlineInfo size={24} />
      <span>{t("All information, images, and files can be modified after publishing")}</span>
    </div>
    <p className={"my-1"}>{t("Title")}</p>
    <input type="text" className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
    <div className={"h-4"}></div>
    <p className={"my-1"}>{t("Alternative Titles")}</p>
    {
      altTitles.map((title, index) => {
        return <div key={index} className={"flex items-center my-2"}>
          <input type="text" className="input w-full" value={title} onChange={(e) => {
            const newAltTitles = [...altTitles]
            newAltTitles[index] = e.target.value
            setAltTitles(newAltTitles)
          }} />
          <button className={"btn btn-square btn-error ml-2"} type={"button"} onClick={() => {
            const newAltTitles = [...altTitles]
            newAltTitles.splice(index, 1)
            setAltTitles(newAltTitles)
          }}>
            <MdDelete size={24} />
          </button>
        </div>
      })
    }
    <button className={"btn my-2"} type={"button"} onClick={() => {
      setAltTitles([...altTitles, ""])
    }}>
      <MdAdd />
      {t("Add Alternative Title")}
    </button>
    <div className={"h-2"}></div>
    <p className={"my-1"}>{t("Tags")}</p>
    <p className={"my-1 pb-1"}>
      {
        tags.map((tag, index) => {
          return <span key={index} className={"badge badge-primary mr-2"}>{tag.name}</span>
        })
      }
    </p>
    <TagInput onAdd={(tag) => {
      setTags([...tags, tag])
    }} />
    <div className={"h-4"}></div>
    <p className={"my-1"}>{t("Description")}</p>
    <textarea className="textarea w-full min-h-80 p-4" value={article} onChange={(e) => setArticle(e.target.value)} />
    <div className={"flex items-center py-1 "}>
      <MdOutlineInfo className={"inline mr-1"} />
      <span className={"text-sm"}>{t("Use Markdown format")}</span>
    </div>
    <div className={"h-4"}></div>
    <p className={"my-1"}>{t("Images")}</p>
    <div role="alert" className="alert alert-info alert-soft my-2">
      <MdOutlineInfo size={24} />
      <span>{t("Images will not be displayed automatically, you need to reference them in the description")}</span>
    </div>
    <div className={`rounded-box border border-base-content/5 bg-base-100 ${images.length === 0 ? "hidden" : ""}`}>
      <table className={"table"}>
        <thead>
          <tr>
            <td>{t("Preview")}</td>
            <td>{t("Link")}</td>
            <td>{t("Action")}</td>
          </tr>
        </thead>
        <tbody>
          {
            images.map((image, index) => {
              return <tr key={index} className={"hover"}>
                <td>
                  <img src={network.getImageUrl(image)} className={"w-16 h-16 object-cover card"} alt={"image"} />
                </td>
                <td>
                  {network.getImageUrl(image)}
                </td>
                <td>
                  <button className={"btn btn-square"} type={"button"} onClick={() => {
                    const id = images[index]
                    const newImages = [...images]
                    newImages.splice(index, 1)
                    setImages(newImages)
                    network.deleteImage(id)
                  }}>
                    <MdDelete size={24} />
                  </button>
                </td>
              </tr>
            })
          }
        </tbody>
      </table>
    </div>
    <button className={"btn my-2"} type={"button"} onClick={addImage}>
      {isUploading ? <span className="loading loading-spinner"></span> : <MdAdd />}
      {t("Upload Image")}
    </button>
    <div className={"h-4"}></div>
    {
      error && <div role="alert" className="alert alert-error my-2 shadow">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none"
          viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{t("Error")}: {error}</span>
      </div>
    }
    <div className={"flex flex-row-reverse mt-4"}>
      <button className={"btn btn-accent shadow"} onClick={handleSubmit}>
        {isSubmitting && <span className="loading loading-spinner"></span>}
        {t("Publish")}
      </button>
    </div>
  </div>
}

function TagInput({ onAdd }: { onAdd: (tag: Tag) => void }) {
  const [keyword, setKeyword] = useState<string>("")
  const [tags, setTags] = useState<Tag[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setLoading] = useState(false)

  const debounce = useRef(new Debounce(500))

  const { t } = useTranslation();

  const searchTags = async (keyword: string) => {
    if (keyword.length === 0) {
      return
    }
    setLoading(true)
    setTags([])
    setError(null)
    const res = await network.searchTags(keyword)
    if (!res.success) {
      setError(res.message)
      setLoading(false)
      return
    }
    setTags(res.data!)
    setLoading(false)
  }

  const handleChange = async (v: string) => {
    setKeyword(v)
    setTags([])
    setError(null)
    if (v.length !== 0) {
      setLoading(true)
      debounce.current.run(() => searchTags(v))
    } else {
      setLoading(false)
      debounce.current.cancel()
    }
  }

  const handleCreateTag = async (name: string) => {
    setLoading(true)
    const res = await network.createTag(name)
    if (!res.success) {
      setError(res.message)
      setLoading(false)
      return
    }
    onAdd(res.data!)
    setKeyword("")
    setTags([])
    setLoading(false)
    const input = document.getElementById("search_tags_input") as HTMLInputElement
    input.blur()
  }

  let dropdownContent = <></>
  if (error) {
    dropdownContent = <div className="alert alert-error my-2">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{error}</span>
    </div>
  } else if (!keyword) {
    dropdownContent = <div className="flex flex-row py-2 px-4">
      <LuInfo size={20} />
      <span className={"w-2"} />
      <span className={"flex-1"}>{t("Please enter a search keyword")}</span>
    </div>
  } else if (isLoading) {
    dropdownContent = <div className="flex flex-row py-2 px-4">
      <span className={"loading loading-spinner loading-sm"}></span>
      <span className={"w-2"} />
      <span className={"flex-1"}>{t("Searching...")}</span>
    </div>
  } else {
    const haveExactMatch = tags.find((t) => t.name === keyword) !== undefined
    dropdownContent = <>
      {
        tags.map((t) => {
          return <li key={t.id} onClick={() => {
            onAdd(t);
            setKeyword("")
            setTags([])
            const input = document.getElementById("search_tags_input") as HTMLInputElement
            input.blur()
          }}><a>{t.name}</a></li>
        })
      }
      {
        !haveExactMatch && <li onClick={() => {
          handleCreateTag(keyword)
        }}><a>{t("Create Tag")}: {keyword}</a></li>
      }
    </>
  }

  return <div className={"dropdown dropdown-end"}>
    <label className="input">
      <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2.5"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </g>
      </svg>
      <input autoComplete={"off"} id={"search_tags_input"} tabIndex={0} type="text" className="grow" placeholder={t("Search Tags")} value={keyword} onChange={(e) => handleChange(e.target.value)} />
    </label>
    <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow mt-2 border border-base-300">
      {dropdownContent}
    </ul>
  </div>
}

class Debounce {
  private timer: number | null = null
  private readonly delay: number

  constructor(delay: number) {
    this.delay = delay
  }

  run(callback: () => void) {
    if (this.timer) {
      clearTimeout(this.timer)
    }
    this.timer = setTimeout(() => {
      callback()
    }, this.delay)
  }

  cancel() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}