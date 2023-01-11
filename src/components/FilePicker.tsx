import React, {
  Fragment,
  ReactElement,
  createContext,
  forwardRef,
  useEffect,
  useState
} from 'react'
import { Connection, File } from '../types'
import { Modal } from './Modal'
import { ModalContent } from './ModalContent'

export interface Props {
  /**
   * The ID of your Unify application
   */
  appId: string
  /**
   * The ID of the consumer which you want to fetch files from
   */
  consumerId: string
  /**
   * The JSON Web Token returned from the Create Session call
   */
  jwt: string
  /**
   * The function that gets called when a file is selected
   */
  onSelect?: (file: File) => any
  /**
   * The function that gets called when a connection is selected
   */
  onConnectionSelect?: (connection: Connection) => any
  /**
   * The component that should trigger the File Picker modal on click
   */
  trigger?: ReactElement
  /**
   * Title shown in the modal
   */
  title?: string
  /**
   * Subtitle shown in the modal
   */
  subTitle?: string
  /**
   * Show powered by Apideck in the modal backdrop
   */
  showAttribution?: boolean
  /**
   * Opens the file picker if set to true
   */
  open?: boolean
  /**
   * Callback function that gets called when the modal is closed
   */
  onClose?: () => any
  /**
   * File to save. Forces the FilePicker to go in "Upload" mode and only
   * allows to change the file name and select the folder to upload the provided file to
   */
  fileToSave?: File | any
  /**
   * Vault url. Allows to overwrite the URL of the vault.
   */
  vaultUrl?: string
}

export const EventsContext = createContext({ onSelect: undefined })

/**
 * The Apideck File Picker component
 */
export const FilePicker = forwardRef<HTMLElement, Props>(function FilePicker(
  {
    appId,
    consumerId,
    jwt,
    trigger,
    onSelect,
    onConnectionSelect,
    title,
    subTitle,
    showAttribution = true,
    open = false,
    onClose,
    fileToSave,
    vaultUrl
  },
  ref
) {
  const [isOpen, setIsOpen] = useState<boolean>(false)

  const handleFileSelect = (file: File) => {
    let fileToReturn = file
    if (file.connection) {
      const { connection, ...rest } = file
      fileToReturn = rest
    }
    if (onSelect) onSelect(fileToReturn)
    onCloseModal()
  }

  const handleConnectionSelect = (connection: Connection) => {
    if (onConnectionSelect) onConnectionSelect(connection)
  }

  const onCloseModal = () => {
    setIsOpen(false)
    if (onClose) {
      onClose()
    }
  }

  useEffect(() => {
    if (open) {
      setIsOpen(true)
    }
  }, [open])
  return (
    <Fragment>
      {trigger ? React.cloneElement(trigger, { onClick: () => setIsOpen(true), ref }) : null}
      <Modal isOpen={isOpen} onClose={() => onCloseModal()} showAttribution={showAttribution}>
        <ModalContent
          appId={appId}
          consumerId={consumerId}
          jwt={jwt}
          onSelect={handleFileSelect}
          onConnectionSelect={handleConnectionSelect}
          title={title ? title : fileToSave ? 'Apideck File Uploader' : 'Apideck File Picker'}
          subTitle={subTitle ? subTitle : fileToSave ? 'Select a folder' : 'Select a file'}
          fileToSave={fileToSave}
          vaultUrl={vaultUrl}
        />
      </Modal>
    </Fragment>
  )
})
