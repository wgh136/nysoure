import { Resource } from "../network/models.ts";
import { network } from "../network/network.ts";
import { useNavigate } from "react-router";

export default function ResourceCard({ resource }: { resource: Resource }) {
  const navigate = useNavigate()

  return <div className={"p-2 cursor-pointer"} onClick={() => {
    navigate(`/resources/${resource.id}`)
  }}>
    <div className={"card shadow hover:shadow-md transition-shadow"}>
      {
        resource.image != null && <figure>
          <img
            src={network.getImageUrl(resource.image.id)}
            alt="cover" style={{
              width: "100%",
              aspectRatio: resource.image.width / resource.image.height,
            }}/>
        </figure>
      }
      <div className="flex flex-col p-4">
        <h2 className="card-title">{resource.title}</h2>
        <div className="h-2"></div>
        <p>
          {
            resource.tags.map((tag) => {
              return <span key={tag.id} className={"badge badge-primary mr-2"}>{tag.name}</span>
            })
          }
        </p>
        <div className="h-2"></div>
        <div className="flex items-center">
          <div className="avatar">
            <div className="w-6 rounded-full">
              <img src={network.getUserAvatar(resource.author)} />
            </div>
          </div>
          <div className="w-2"></div>
          <div className="text-sm">{resource.author.username}</div>
        </div>
      </div>
    </div>
  </div>
}