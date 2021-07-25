import React from "react";

import general from "./general.module.css";

interface TextInputProps {
  maxLength: number,
  value: string,
  label: string,
  placeholder?: string,
  changeCallback: (newValue: string) => void
  submitCallback: () => void
}

export default function TextInput(props: TextInputProps): JSX.Element {
  const submitIfEnterPressed = (key: React.KeyboardEvent<HTMLInputElement>) => {
    if (key.code === "Enter") {
      props.submitCallback();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.changeCallback(e.target.value);
  };

  return (
    <div className={general.horizWrapper}>
      <div className={`${general.spacer} ${general.growable}`}>
        <div className={general.settingTextWrapper}>
          <div className={general.horizWrapper}>
            {props.label}
            <input className={general.settingsInput}
                   maxLength={props.maxLength}
                   value={props.value}
                   placeholder={props.placeholder}
                   onChange={handleChange}
                   onKeyDown={submitIfEnterPressed} />
          </div>
        </div>
      </div>
    </div>
  );
}
