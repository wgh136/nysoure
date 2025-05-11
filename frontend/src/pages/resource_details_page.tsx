import { useParams } from "react-router";
import {createContext, useCallback, useEffect, useState} from "react";
import {ResourceDetails, RFile} from "../network/models.ts";
import { network } from "../network/network.ts";
import showToast from "../components/toast.ts";
import Markdown from "react-markdown";
import "../markdown.css";
import Loading from "../components/loading.tsx";
import {MdAdd, MdOutlineArticle, MdOutlineComment, MdOutlineDataset} from "react-icons/md";
import {app} from "../app.ts";

export default function ResourcePage() {
  const params = useParams()

  const idStr = params.id

  const id = idStr ? parseInt(idStr) : NaN

  const [resource, setResource] = useState<ResourceDetails | null>(null)
  
  const reload = useCallback(async () => {
    if (!isNaN(id)) {
      setResource(null)
      const res = await network.getResourceDetails(id)
      if (res.success) {
        setResource(res.data!)
      } else {
        showToast({ message: res.message, type: "error" })
      }
    }
  }, [id])

  useEffect(() => {
    if (!isNaN(id)) {
      network.getResourceDetails(id).then((res) => {
        if (res.success) {
          setResource(res.data!)
        } else {
          showToast({ message: res.message, type: "error" })
        }
      })
    }
  }, [id])

  if (isNaN(id)) {
    return <div className="alert alert-error shadow-lg">
      <div>
        <span>Resource ID is required</span>
      </div>
    </div>
  }

  if (!resource) {
    return <Loading />
  }

  return <context.Provider value={reload}>
    <div className={"pt-2"}>
      <h1 className={"text-2xl font-bold px-4 py-2"}>{resource.title}</h1>
      {
        resource.alternativeTitles.map((e) => {
          return <h2 className={"text-lg px-4 py-1 text-gray-700 dark:text-gray-300"}>{e}</h2>
        })
      }
      <button className="border-b-2 mx-4 py-1 cursor-pointer border-transparent hover:border-primary transition-colors duration-200 ease-in-out">
        <div className="flex items-center ">
          <div className="avatar">
            <div className="w-6 rounded-full">
              <img src={network.getUserAvatar(resource.author)} alt={"avatar"} />
            </div>
          </div>
          <div className="w-2"></div>
          <div className="text-sm">{resource.author.username}</div>
        </div>
      </button>
      <p className={"px-4 pt-2"}>
        {
          resource.tags.map((e) => {
            return <span className="badge badge-primary mr-2">{e.name}</span>
          })
        }
      </p>
      <div className="tabs tabs-box my-4 mx-2 p-4">
        <label className="tab ">
          <input type="radio" name="my_tabs" defaultChecked/>
          <MdOutlineArticle className="text-xl mr-2"/>
          <span className="text-sm">
          Description
        </span>
        </label>
        <div className="tab-content p-2">
          <Article article={resource.article} />
        </div>

        <label className="tab">
          <input type="radio" name="my_tabs"/>
          <MdOutlineDataset className="text-xl mr-2"/>
          <span className="text-sm">
          Files
        </span>
        </label>
        <div className="tab-content p-2">
          <Files files={resource.files} />
        </div>

        <label className="tab">
          <input type="radio" name="my_tabs"/>
          <MdOutlineComment className="text-xl mr-2"/>
          <span className="text-sm">
          Comments
        </span>
        </label>
        <div className="tab-content p-2">Comments</div>
      </div>
      <div className="h-4"></div>
    </div>
  </context.Provider>
}

const context = createContext<() => void>(() => {})

function Article({ article }: { article: string }) {
  return <article>
    <Markdown>{article}</Markdown>
  </article>
}

function FileTile({ file }: { file: RFile }) {
  // TODO: implement file tile
  return <div></div>
}

function Files({files}: { files: RFile[]}) {
  return <div>
    {
      files.map((file) => {
        return <FileTile file={file} key={file.id}></FileTile>
      })
    }
    {
      app.isAdmin() && <div className={"flex flex-row-reverse"}>
        <button className={"btn btn-accent shadow"}>
          <MdAdd size={24}/>
          <span className={"text-sm"}>
            Upload
          </span>
        </button>
      </div>
    }
  </div>
}