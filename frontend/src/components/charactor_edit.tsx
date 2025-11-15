import { useState } from "react";
import { CharactorParams } from "../network/models";
import { network } from "../network/network";
import showToast from "./toast";
import { useTranslation } from "../utils/i18n";

export default function CharactorEditor({charactor, setCharactor, onDelete}: {
    charactor: CharactorParams;
    setCharactor: (charactor: CharactorParams) => void;
    onDelete: () => void;
}) {
    const { t } = useTranslation();
    const [isUploading, setUploading] = useState(false);

    const uploadImage = async () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        if (!input.files || input.files.length === 0) {
          return;
        }
        setUploading(true);
        const file = input.files[0];
        const result = await network.uploadImage(file);
        setUploading(false);
        if (result.success) {
          setCharactor({
            ...charactor,
            image: result.data!,
          });
        } else {
          showToast({
            type: "error",
            message: `Failed to upload image`,
          })
        }
      };
      input.click();
    }

    return <div className="h-52 shadow rounded-2xl overflow-clip flex">
      <div className="w-36 h-full cursor-pointer relative" onClick={uploadImage}>
        {
          isUploading ?
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <span className="loading loading-spinner loading-lg text-white"></span>
          </div>
          : null
        }
        <img 
          className="w-full h-full object-cover bg-base-200/80 hover:bg-base-200 transition-colors" 
          src={charactor.image === 0 ? "/cp.webp" : network.getImageUrl(charactor.image)} alt={charactor.name} 
        />
      </div>
      
      <div className="flex-1 p-4 flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            className="input input-sm input-bordered flex-1"
            placeholder={t("Name")}
            value={charactor.name}
            onChange={(e) => setCharactor({ ...charactor, name: e.target.value })}
          />
          <button 
            className="btn btn-sm btn-error btn-square"
            onClick={onDelete}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <input
          type="text"
          className="input input-sm input-bordered"
          placeholder="CV"
          value={charactor.cv}
          onChange={(e) => setCharactor({ ...charactor, cv: e.target.value })}
        />
        
        <div className="flex-1">
          <textarea
            className="textarea textarea-bordered w-full h-full resize-none text-xs"
            placeholder={t("Aliases (one per line)")}
            value={charactor.alias.join('\n')}
            onChange={(e) => setCharactor({ 
              ...charactor, 
              alias: e.target.value.split('\n').filter(line => line.trim() !== '') 
            })}
          />
        </div>
      </div>
    </div>;
}