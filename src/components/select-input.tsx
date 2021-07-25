import * as React from "react";

import general from "./general.module.css";

interface SelectInputProps {
  label: string,
  selected: string,
  options: string[],
  selectCallback: (string) => void
}

function optionsJsx(options: string[]): JSX.Element[] {
  return options.map((option) => {
    return (
      <option value={option}
              key={option}>{option}</option>
    );
  });
}

export default function SelectInput(props: SelectInputProps): JSX.Element {
  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    props.selectCallback(e.target.value);
  };

  return (
    <div className={general.horizWrapper}>
      <div className={`${general.horizWrapper} ${general.spacer}`}>
        {props.label}
        <select className={general.settingsInput}
                value={props.selected}
                onChange={handleSelect}>
          {optionsJsx(props.options)}
        </select>
      </div>
    </div>
  );
}
