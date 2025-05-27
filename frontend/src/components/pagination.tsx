import {ReactNode} from "react";
import {MdChevronLeft, MdChevronRight} from "react-icons/md";

export default function Pagination({page, setPage, totalPages}: {
  page: number,
  setPage: (page: number) => void,
  totalPages: number
}) {
  const items: ReactNode[] = [];

  if (page > 1) {
    items.push(<button key={"btn-1"} className="join-item btn" onClick={() => setPage(1)}>1</button>);
  }
  if (page - 2 > 1) {
    items.push(<button key={"btn-2"} className="join-item btn">...</button>);
  }
  if (page - 1 > 1) {
    items.push(<button key={"btn-3"} className="join-item btn" onClick={() => setPage(page - 1)}>{page - 1}</button>);
  }
  items.push(<button key={"btn-4"} className="join-item btn btn-active">{page}</button>);
  if (page + 1 < totalPages) {
    items.push(<button key={"btn-5"} className="join-item btn" onClick={() => setPage(page + 1)}>{page + 1}</button>);
  }
  if (page + 2 < totalPages) {
    items.push(<button key={"btn-6"} className="join-item btn">...</button>);
  }
  if (page < totalPages) {
    items.push(<button key={"btn-7"} className="join-item btn" onClick={() => setPage(totalPages)}>{totalPages}</button>);
  }

  return <div className="join shadow rounded-field">
    <button key={"btn-prev"} className={`join-item btn`} onClick={() => {
      if (page > 1) {
        setPage(page - 1);
      }
    }}>
      <MdChevronLeft size={20} className="opacity-50"/>
    </button>
    {items}
    <button key={"btn-next"} className={`join-item btn`} onClick={() => {
      if (page < totalPages) {
        setPage(page + 1);
      }
    }}>
      <MdChevronRight size={20} className="opacity-50"/>
    </button>
  </div>
}