import * as React from "react";

import general from "./general.module.css";

interface CheckboxInputProps {
  label: string
  checked: boolean,
  checkCallback: (newIsChecked: boolean) => void
}

export default function CheckboxInput(props: CheckboxInputProps): JSX.Element {
  const handleCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.checkCallback(e.target.checked);
  };

  return (
    <div className={general.spacer}>
      {props.label}
      <input type={'checkbox'}
          checked={props.checked}
          onChange={handleCheck} />
    </div>
  );
}
