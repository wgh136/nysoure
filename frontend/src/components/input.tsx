import React from "react";

interface InputProps {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  inlineLabel?: boolean;
}

export default function Input(props: InputProps) {
  if (props.inlineLabel) {
    return (
      <label className="input w-full">
        {props.label}
        <input
          type={props.type}
          className="grow"
          placeholder={props.placeholder}
          value={props.value}
          onChange={props.onChange}
        />
      </label>
    );
  } else {
    return (
      <fieldset className="fieldset w-full">
        <legend className="fieldset-legend">{props.label}</legend>
        <input
          type={props.type}
          className="input w-full"
          placeholder={props.placeholder}
          value={props.value}
          onChange={props.onChange}
        />
      </fieldset>
    );
  }
}

interface TextAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  label: string;
  height?: string | number;
}

export function TextArea(props: TextAreaProps) {
  return (
    <fieldset className="fieldset w-full">
      <legend className="fieldset-legend">{props.label}</legend>
      <textarea
        className={`textarea w-full ${props.height != undefined ? "resize-none" : ""}`}
        value={props.value}
        onChange={props.onChange}
        style={{
          height: props.height,
        }}
      />
    </fieldset>
  );
}
