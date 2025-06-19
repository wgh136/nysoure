import { MdArrowDropDown } from "react-icons/md";
import { createRef } from "react";

export default function Select({
  current,
  values,
  onSelected,
}: {
  current?: number;
  values: string[];
  onSelected: (value: number) => void;
}) {
  const menuRef = createRef<HTMLUListElement>();

  if (!values || values.length === 0) {
    return <></>;
  }
  if (current && (current < 0 || current >= values.length)) {
    current = undefined;
  }

  return (
    <div className={"dropdown"}>
      <div>
        <div
          tabIndex={0}
          role={"button"}
          className={
            "flex border border-primary rounded-3xl px-4 py-2 items-center cursor-pointer min-w-52 focus:outline-2 focus:outline-primary outline-offset-2"
          }
        >
          <span className={"flex-1 text-sm"}>
            {current != null && values[current]}
          </span>
          <span className={"w-4"}></span>
          <MdArrowDropDown size={20} />
        </div>
      </div>
      <ul
        ref={menuRef}
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow mt-1"
      >
        {values.map((value, index) => (
          <li
            key={index}
            className={`cursor-pointer ${current === index ? "bg-primary text-primary-content rounded-box" : ""}`}
            onClick={() => {
              menuRef.current?.blur();
              onSelected(index);
            }}
          >
            <span>{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
