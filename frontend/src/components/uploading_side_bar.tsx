import {useEffect, useState} from "react";
import {uploadingManager, UploadingTask} from "../network/uploading.ts";
import {MdArrowUpward} from "react-icons/md";

export default function UploadingSideBar() {
  const [showUploading, setShowUploading] = useState(false);

  useEffect(() => {
    const listener = () => {
      console.log("Uploading tasks changed; show uploading: ", uploadingManager.hasTasks());
      setShowUploading(uploadingManager.hasTasks())
    };

    uploadingManager.addListener(listener)

    return () => {
      uploadingManager.removeListener(listener)
    }
  }, []);

  if (!showUploading) {
    return <></>
  }

  return <>
    <label htmlFor={"uploading-drawer"} className={"btn btn-square btn-ghost relative btn-accent text-primary"}>
      <div className={"w-6 h-6 overflow-hidden relative"}>
        <MdArrowUpward className={"move-up-animation pb-0.5"} size={24}/>
        <div className={"absolute border-b-2 w-5 bottom-1 left-0.5"}></div>
      </div>
    </label>
    <div className="drawer w-0">
      <input id="uploading-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-side">
        <label htmlFor="uploading-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
        <div className="menu bg-base-200 text-base-content h-full w-80 p-4 overflow-y-auto ">
          <div className={"grid grid-cols-1"}>
            <h2 className={"text-xl mb-2"}>Uploading</h2>
            <UploadingList/>
          </div>
        </div>
      </div>
    </div>
  </>
}

function UploadingList() {
  const [tasks, setTasks] = useState(uploadingManager.getTasks());

  useEffect(() => {
    const listener = () => {
      setTasks(uploadingManager.getTasks());
    }

    uploadingManager.addListener(listener)

    return () => {
      uploadingManager.removeListener(listener)
    }
  }, []);

  return <>
    {
      tasks.map((task) => {
        return <TaskTile key={task.id} task={task}/>
      })
    }
  </>
}

function TaskTile({task}: {task: UploadingTask}) {
  const [progress, setProgress] = useState(task.progress);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const listener = () => {
      setProgress(task.progress);
      setError(task.errorMessage);
    }

    task.addListener(listener)

    return () => {
      task.removeListener(listener)
    }
  }, [task]);

  return <div className={"card card-border border-base-300 p-2 my-2 w-full"}>
    <p className={"p-1 mb-2 w-full break-all line-clamp-2"}>{task.filename}</p>
    <progress className="progress progress-primary my-2" value={100 * progress} max={100}/>
    {error && <p className={"text-error p-1"}>{error}</p>}
    <div className={"my-2 flex flex-row-reverse"}>
      <button className={"btn btn-error h-7"} onClick={() => {
        const dialog = document.getElementById(`cancel_task_${task.id}`) as HTMLDialogElement;
        dialog.showModal();
      }}>
        Cancel
      </button>
    </div>
    <dialog id={`cancel_task_${task.id}`} className="modal">
      <div className="modal-box">
        <h3 className="text-lg font-bold">Cancel Task</h3>
        <p className="py-4">Are you sure you want to cancel this task?</p>
        <div className="modal-action">
          <form method="dialog">
            <button className="btn">Close</button>
          </form>
          <button className="btn btn-error mx-2" type={"button"} onClick={() => {
            task.cancel();
            const dialog = document.getElementById(`cancel_task_${task.id}`) as HTMLDialogElement;
            dialog.close();
          }}>
            Confirm
          </button>
        </div>
      </div>
    </dialog>
  </div>
}