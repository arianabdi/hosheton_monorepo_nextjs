import React, {useEffect, useState} from "react";
import {useDropzone} from "react-dropzone";

import './styles.css'
import {IoMdClose} from "react-icons/io";


export const DropdownFileUploader = ({
                                       className,
                                       multiple,
                                       fileUploadType,
                                       fileUploadAcceptedFiles,
                                       onChange,
                                       value,
                                       ...props
                                     }) => {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState([]);


  function onClose() {

  }

  function onUpload() {
    alert('onUpload')
  }

  useEffect(() => {
    onChange(files);
  }, [files])

  function formatBytes(bytes) {
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    } else {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
  }


  const onDrop = (acceptedFiles) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0
    }));
    setFiles([...files, ...newFiles]);
  };


  const removeFile = (index) => {
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
  };


  const {
    getRootProps,
    getInputProps,
    acceptedFiles,
    fileRejections
  } = useDropzone({onDrop, multiple: multiple, accept: fileUploadAcceptedFiles})


  //File Upload style
  const selectedFilesOfFileUpload = files?.map((fileItem, index) => (
    <Row className="upload-item">
      <Column md="2" className="uploader-image">
        <img src={fileItem.preview} alt={""}/>
      </Column>
      <Col md="8" className="uploader-content" style={{margin: "auto"}}>
        <Row className="uploader-filename"><p className="no-padding">{fileItem.file.name}</p></Row>
        <Row className="uploader-progress"><Progress className="progress-sm progress-upload" value={fileItem.progress}
                                                     max="100"/></Row>
        <Row className="uploader-filesize"><Col md="6" className="no-padding"><p>{formatBytes(fileItem.file.size)}</p>
        </Col><Col md="6" className="percentage no-padding"><p>{fileItem.progress}%</p></Col></Row>
      </Col>
      <Col md="2">
        <Row className="uploader-close" style={{height: "100%"}}>
          <Col md="6" className="action-btn" onClick={() => removeFile(index)}>
            <IoMdClose size={19} color={"#526484"}/>
          </Col>
        </Row>
      </Col>
    </Row>
  ))

  //Post style
  const selectedFilesOfPost = files?.map((fileItem, index) => (
    <div className="style-2">
      <div>
        <Row className="uploader-image-container">
          <div className="uploader-image">
            <div className="image">
              <img src={fileItem.preview} alt={""}/>
            </div>
          </div>
          <div className="action-btn" onClick={() => removeFile(index)}>
            <IoMdClose size={19} color={"#526484"}/>
          </div>
        </Row>

        <Row>
          <Col md="12" className="uploader-content" style={{margin: "auto"}}>
            <Row className="uploader-filename"><p className="no-padding">{fileItem.file.name}</p></Row>
            {/*<Row className="uploader-progress"><Progress className="progress-sm progress-upload" value={fileItem.progress} max="100"  /></Row>*/}
            {/*<Row className="uploader-filesize"><Col md="6" className="no-padding"><p>{formatBytes(fileItem.file.size)}</p></Col><Col md="6" className="percentage no-padding"><p>{fileItem.progress}%</p></Col></Row>*/}
          </Col>
        </Row>
      </div>
    </div>

  ))


  //Profile style
  const selectedFilesOfProfile = files?.map((fileItem, index) => (
    <div className="style-3">
      <div>
        <Row className="uploader-image-container">
          <div className="uploader-image">
            <div className="image">
              <img src={fileItem.preview} alt={""}/>
            </div>
          </div>
          <div className="action-btn" onClick={() => removeFile(index)}>
            <IoMdClose size={19} color={"#526484"}/>
          </div>
        </Row>

        <Row>
          <Col md="12" className="uploader-content" style={{margin: "auto"}}>
            <Row className="uploader-filename"><p className="no-padding">{fileItem.file.name}</p></Row>
            <Row className="uploader-progress"><Progress className="progress-sm progress-upload"
                                                         value={fileItem.progress} max="100"/></Row>
            <Row className="uploader-filesize"><Col md="6" className="no-padding">
              <p>{formatBytes(fileItem.file.size)}</p></Col><Col md="6" className="percentage no-padding">
              <p>{fileItem.progress}%</p></Col></Row>
          </Col>
        </Row>
      </div>
    </div>

  ))


  const acceptedFileItems = acceptedFiles.map(file => (
    <li key={file.path}>
      {file.path} - {file.size} bytes
    </li>
  ));

  const fileRejectionItems = fileRejections.map(({file, errors}) => (
    <li key={file.path}>
      {file.path} - {file.size} bytes
      <ul>
        {errors.map(e => (
          <li key={e.code}>{e.message}</li>
        ))}
      </ul>
    </li>
  ));

  const uploadPost = async () => {
    // const docRef = await addDoc(col)
  }

  function UploadZone({inputProps, getRootProps}) {
    return (
      <div {...getRootProps()}>

        <div className="drop-zone">
          <input {...inputProps()} />
          <p>لطف فایل های خود را انتخاب کنید</p>
        </div>
        {/* <input {...getInputProps()} />
        {
          <p>Drop the files here ...</p>
        } */}
      </div>
    )
  }

  return (
    <di className={className}>
      {
        (multiple || (!multiple && selectedFilesOfFileUpload.length === 0 && selectedFilesOfPost.length === 0 && selectedFilesOfProfile.length === 0)) ?
          <div {...getRootProps()}>
            <div className="drop-zone">
              <input {...getInputProps()} />
              <p>لطف فایل های خود را انتخاب کنید</p>
            </div>
            {/* <input {...getInputProps()} />
          {
            <p>Drop the files here ...</p>
          } */}
          </div> : ''
      }
      {
        fileUploadType === FileUploadType.FILE_UPLOAD ? selectedFilesOfFileUpload :
          (fileUploadType === FileUploadType.POST ? selectedFilesOfPost : (
            (fileUploadType === FileUploadType.PROFILE ? selectedFilesOfProfile : '')
          ))
      }
      {
        // (
        //   selectedFilesOfFileUpload.length > 0 ||
        //   selectedFilesOfPost.length > 0 ||
        //   selectedFilesOfProfile.length > 0
        //   ) ?
        //   <button
        //     className="btn btn-success  w-100 add_plan_button"
        //     onClick={()=> {uploadFiles()}}
        //   >
        //     <span>آپلود فایل</span>
        //     {/* <span >{isLoading ? <Spinner size="sm"></Spinner> : ''}آپلود</span> */}
        //   </button>
        // : ''
      }

    </di>
  )
}


