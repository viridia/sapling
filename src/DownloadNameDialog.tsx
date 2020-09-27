import React, { FC, useCallback, useLayoutEffect, useState } from 'react';
import { Button } from './controls/Button';
import { TextInput } from './controls/TextInput';
import { Dialog, DialogBody, DialogFooter, DialogHeader } from './controls/Dialog';

interface Props {
  name: string;
  open: boolean;
  onClose?: () => void;
  onExited?: () => void;
  onChangeName: (name: string) => void;
  onDownload: () => void;
}

export const DownloadNameDialog: FC<Props> = ({
  name,
  open,
  onClose,
  onExited,
  onChangeName,
  onDownload,
}) => {
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);

  useLayoutEffect(() => {
    if (inputRef) {
      inputRef.select();
    }
  }, [inputRef]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChangeName(e.currentTarget.value);
    },
    [onChangeName]
  );

  return (
    <Dialog open={open} onClose={onClose} onExited={onExited} ariaLabel="Download Model">
      <DialogHeader>Download Model</DialogHeader>
      <DialogBody>
        <p>Set name for downloaded file:</p>
        <TextInput
          ref={setInputRef}
          type="text"
          autoFocus
          value={name}
          onChange={onChange}
        ></TextInput>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onDownload}>Download</Button>
      </DialogFooter>
    </Dialog>
  );
};
