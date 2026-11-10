// @ts-nocheck
'use client';

import React, {useRef, useState} from "react";
import Select from "react-select";
// import {useTranslation} from "react-i18next";
import MultiDatePicker from "react-multi-date-picker";
import fa from "react-date-object/locales/persian_fa";
import en from "react-date-object/locales/gregorian_en";
// // import jalali from "react-date-object/calendars/jalali";
// // import gregorian from "react-date-object/calendars/gregorian";
// // import TimePicker from "react-multi-date-picker/plugins/time_picker";
// import TimePicker from 'react-awesome-time-picker';
// import 'react-awesome-time-picker/assets/index.css';

// import {ModalHelper} from "../modal-helper/modalHelper";
// import {SelectableTreeModal} from "../tree/modal/selectableTreeModal";
// import {DropdownFileUploader} from "./DropdownFileUploader/DropdownFileUploader";
import './suneditor/suneditor.min.css'; // Import Sun Editor's CSS File
import SunEditor from "suneditor-react";

import styles from './field.module.scss'
import {MdOutlineFileCopy} from "react-icons/md";
import {VscEye, VscEyeClosed} from "react-icons/vsc";
import {copyToClipboard} from "@my-workspace/utils";
import jalali from "react-date-object/calendars/jalali";
import gregorian from "react-date-object/calendars/gregorian";

export const Field = ({
  id,
  ref,
  key,
  name,
  type,
  label,
  value,
  checked,
  // file-upload
  fileUploadType,
  isMulti,
  fileUploadAcceptedFiles,
  formControlClassName,
  multiple,
  accept,
  format,
  sources,
  useCopyIcon = false,
  disabled,
  isJalali,
  defaultValue,
  options,
  treeMode,
  treeSection,
  rows,
  className,
  onKeyPress,
  errors,
  buttonList,
  validation,
  showSuccessValidation,
  placeholder,
  labelClassName,
  onChange,
  onClick,
  onBlur,
  onFocus,
  ...props
}: any) => {

    const [modalComponent, setModalComponent] = useState(<div> empty </div>);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState('');
    const [showPassword, setShowPassword] = useState(false)

    let invalid = {
        color: "#e85347",
        fontSize: "11px",
        fontStyle: "italic"
    }


    function FieldLabel() {
        return (
            <>
                {
                    !label ? '' :
                        <div className={`${styles.label}`}>
                            <label style={{opacity: `${disabled ? '0.5' : "1"}`}}>
                                {label}
                            </label>
                        </div>
                }
            </>
        )
    }

    if (type === "number") {
        return (
            <div className={styles.fieldContainer}>
                <FieldLabel/>
                <div className={`${styles.field}`}>
                    <input
                        {...props}
                        onClick={onClick}
                        type="number"
                        step="any"
                        ref={ref}
                        name={name}
                        placeholder={placeholder}
                        disabled={disabled}
                        value={value ?? ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            onChange(val === '' ? '' : parseFloat(val));
                        }}
                        onBlur={onBlur}
                        onFocus={onFocus}
                    />
                </div>
            </div>
        );
    }

    if (type === "text" || type === "password") {

        return (
            <div  className={styles.fieldContainer}>
                <FieldLabel/>
                <div className={`${styles.field} ${type === 'password' ? styles.fieldWithEye : ''}`}>
                    <input
                        {...props}
                        onClick={onClick}
                        type={type === 'password' ? (showPassword ? 'text' : 'password') : 'text'}
                        ref={ref}
                        name={name}
                        placeholder={placeholder}
                        disabled={disabled}
                        // controlled when the caller passes value, otherwise uncontrolled — never both
                        // (React ignores defaultValue on a controlled input and warns about it)
                        {...(value !== undefined ? {value} : {defaultValue})}
                        onChange={(e) => {
                            onChange(e.target.value)
                        }}
                        onKeyPress={onKeyPress}
                        onBlur={onBlur}
                        onFocus={onFocus}
                    />
                    {
                        useCopyIcon ?
                            <div className={`${styles.copyIcon}`}>
                                <MdOutlineFileCopy onClick={() => copyToClipboard(value)}
                                                   color={'var(--body-text-color)'} size={18}/>
                            </div> : ''
                    }
                    {
                        type === "password" ?
                        <div className={styles.passwordEye}>
                            {
                                showPassword ?
                                    <VscEyeClosed size={18} color={"var(--body-text-color)"} onClick={() => {
                                        setShowPassword(false)
                                    }}/> :
                                    <VscEye size={18}  color={"var(--body-text-color)"} onClick={() => {
                                        setShowPassword(true)
                                    }}/>
                            }
                        </div> : ''
                    }

                </div>
            </div>
        )
    }

    if (type === 'editor') {

       const editor = useRef();

        // The sunEditor parameter will be set to the core suneditor instance when this function is called
        const getSunEditorInstance = (sunEditor) => {
            editor.current = sunEditor;
        };

        const full_set = [
            'undo', 'redo',
            'font', 'fontSize', 'formatBlock',
            'paragraphStyle', 'blockquote',
            'bold', 'underline', 'italic', 'strike', 'subscript', 'superscript',
            'fontColor', 'hiliteColor', 'textStyle',
            'removeFormat',
            'outdent', 'indent',
            'align', 'horizontalRule', 'list', 'lineHeight',
            'table', 'link', 'image', 'video', 'audio',
            'fullScreen', 'showBlocks', 'codeView',
            'preview', 'print', 'save', 'template'
        ]

        return (
            <div className={styles.fieldContainer}>
                <FieldLabel/>
                <div>
                    <SunEditor
                        onClick={onClick}
                        getSunEditorInstance={getSunEditorInstance}
                        setContents={value}
                        onChange={(e) => {
                            onChange(e)
                        }}

                        setOptions={{
                            height: 200,
                            buttonList: [buttonList ? buttonList : full_set]
                        }}
                    />
                </div>
            </div>
        )
    }

    if (type === 'date') {

        let date = value === '' || value === null ? null : new Date(value);


        return (
            <div className={styles.fieldContainer}>
                <FieldLabel/>
                <MultiDatePicker
                    onClick={onClick}
                    placeholder={placeholder}
                    style={{width: "100%", padding: ".8rem", boxSizing: "border-box", height: "48px"}}
                    className={`${className}`}
                    value={date}
                    locale={isJalali ? fa : en} ie
                    calendar={isJalali ? jalali : gregorian}
                    disabled={disabled}
                    name={name}
                    id={id}
                    format={format}
                    onClose={onBlur}
                    onChange={event => {
                        if (!event)
                            onChange('')
                        else
                            onChange(new Date(event?.toDate?.().toString()));
                    }}
                />

            </div>
        )
    }

/*
    if (type === 'checkbox') {
        const handleChange = () => {
            // setChecked(!checked);
        };
        return (
            <>
                <div className={styles.fieldContainer}>

                    <label className={styles.customCheckbox}>
                        <input
                            onClick={onClick}
                            key={name}
                            type="checkbox"
                            checked={value}
                            value={value}
                            disabled={disabled}
                            onChange={(e) => {
                                onChange(e.target.checked)
                            }}
                            id={id}
                            name={name}
                        />
                        <span className={styles.checkboxMark}></span>
                        <FieldLabel/>
                    </label>
                </div>
            </>

        )
    }

    if (type === 'tree') {

        return (
            <>

                <ModalHelper
                    open={isModalOpen}
                    onOpen={() => setIsModalOpen(true)}
                    onClose={() => setIsModalOpen(false)}
                    component={modalComponent}
                />
                {
                    treeMode === "category" ?

                        <div className={styles.fieldContainer}>
                            <FieldLabel/>
                            <div>
                                <input
                                    style={{width: "100%", borderRadius: "7px"}}
                                    key={name}
                                    type="text"
                                    checked={value}
                                    value={value?.name}
                                    onClick={() => {
                                        console.log('tree clicked!')
                                        setModalComponent(
                                            <SelectableTreeModal
                                                setIsModalClose={() => {
                                                    setIsModalOpen(false)
                                                }}
                                                section={treeSection}
                                                onSelectNode={async (e) => {
                                                    onChange(e)
                                                    setIsModalOpen(false)
                                                }}
                                            />
                                        )
                                        setIsModalOpen(true);
                                    }}
                                    id={id}
                                    name={name}
                                />
                            </div>
                        </div> : ''
                }
            </>

        )
    }

    if (type === 'time') {
        let time = value === '' || value === null ? null : new Date(value);
        return (
            <div className={styles.fieldContainer}>
                <FieldLabel/>
                <div>

                    <TimePicker
                        onClick={onClick}
                        className={styles.customTimePicker}
                        onChange={(e) => {
                            onChange(e)
                        }}
                        value={value}
                        placeholder={placeholder}
                        format={format || "HH:mm:ss"}
                        disabled={disabled}
                        showHour={false}
                    />


                </div>

            </div>
        )
    }





    if (type === "image-preview") {
        if (!value)
            return null

        return (
            <>
                <div className="card">
                    <FieldLabel className={"label"}/>
                    <img src={value} alt={""}/>
                </div>
            </>
        )
    }

    if (type === "file-upload") {

        return (
            <div className="form-group">
                <FieldLabel/>
                <DropdownFileUploader

                    value={value}
                    className={className}
                    multiple={multiple}
                    fileUploadAcceptedFiles={fileUploadAcceptedFiles}
                    fileUploadType={fileUploadType}
                    onChange={onChange}
                />
            </div>
        )
    }

    if (type === "radiobox") {
        return (
            <div className="form-group">
                <FieldLabel/>
                <ul className="custom-control-group g-3 align-center flex-wrap"

                >
                    {
                        options.map(item => {
                            return (
                                <li>
                                    <div className="custom-control custom-radio"
                                         onClick={(event) => {
                                             onChange(item.value)
                                         }}>
                                        <input

                                            onClick={onClick}
                                            type="radio"
                                            className="custom-control-input"
                                            checked={value === item.value}
                                            name={name}
                                            value={item.value}
                                        />
                                        <label
                                            className="custom-control-label"
                                            htmlFor={name}
                                        >
                                            {item.label}
                                        </label>
                                    </div>
                                </li>
                            )
                        })
                    }
                    {/!*<li>*!/}
                    {/!*    <div className="custom-control custom-radio">*!/}
                    {/!*        <input*!/}
                    {/!*          type="radio"*!/}
                    {/!*          className="custom-control-input"*!/}
                    {/!*          defaultChecked*!/}
                    {/!*          name="reg-public"*!/}
                    {/!*          id="reg-enable"*!/}
                    {/!*        />*!/}
                    {/!*        <label className="custom-control-label" htmlFor="reg-enable">*!/}
                    {/!*            Enable*!/}
                    {/!*        </label>*!/}
                    {/!*    </div>*!/}
                    {/!*</li>*!/}
                    {/!*<li>*!/}
                    {/!*    <div className="custom-control custom-radio">*!/}
                    {/!*        <input*!/}
                    {/!*          type="radio"*!/}
                    {/!*          className="custom-control-input"*!/}
                    {/!*          name="reg-public"*!/}
                    {/!*          id="reg-disable"*!/}
                    {/!*        />*!/}
                    {/!*        <label className="custom-control-label" htmlFor="reg-disable">*!/}
                    {/!*            Disable*!/}
                    {/!*        </label>*!/}
                    {/!*    </div>*!/}
                    {/!*</li>*!/}
                    {/!*<li>*!/}
                    {/!*    <div className="custom-control custom-radio">*!/}
                    {/!*        <input*!/}
                    {/!*          type="radio"*!/}
                    {/!*          className="custom-control-input"*!/}
                    {/!*          name="reg-public"*!/}
                    {/!*          id="reg-request"*!/}
                    {/!*        />*!/}
                    {/!*        <label className="custom-control-label" htmlFor="reg-request">*!/}
                    {/!*            On Request*!/}
                    {/!*        </label>*!/}
                    {/!*    </div>*!/}
                    {/!*</li>*!/}
                </ul>
            </div>
        )
    }







*/
    if (type === "switch") {
        return (
            <label className={styles.switchWrapper}>
                {label && <span className={styles.label}>{label}</span>}
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />

                <span className={styles.track}>
                <span className={styles.thumb}/>
                </span>
            </label>
        )
    }

    if (type === "textarea") {
        return (
            <div className={styles.fieldContainer}>
                <FieldLabel/>
                <div className={`${styles.field}`}>
                    <textarea
                        {...props}
                        key={key}
                        placeholder={placeholder}
                        {...(value !== undefined ? {value} : {defaultValue})}
                        ref={ref}
                        rows={rows}
                        disabled={disabled}
                        id={id}
                        name={name}
                        onChange={(e) => {
                            onChange(e.target.value)
                        }}
                        onBlur={onBlur}
                    ></textarea>
                    {
                        validation ? (!validation.isValid ? (<span
                            className="invalid">{t(validation.message)}</span>) : (showSuccessValidation === true ?
                            <span className="text-success">{t(validation.message)}</span> : '')) : ''
                    }
                </div>
            </div>

        )
    }

    if (type === 'select') {

        const selectOptions = options ? options.map(item => {
            return {value: item.value, label: item.label}
        }) : [{value: '', label: '-'}];
        return (
            <div className={styles.fieldContainer}>
                <FieldLabel/>
                <div>
                    <div className={styles.formControlSelect}>
                        <Select
                            key={name}
                            id={id}
                            name={name}
                            isMulti={isMulti}
                            isDisabled={disabled}
                            classNamePrefix="react-select"
                            // defaultValue={(selectOptions.filter(item => item.value === value))[0]}
                            value={isMulti ? value : (selectOptions.find(item => item.value === value))}
                            options={selectOptions}
                            onChange={(e) => {
                                onChange(isMulti ? e : e.value)
                            }}
                            placeholder={placeholder}
                        />
                    </div>
                    {
                        validation ? (!validation.isValid ? (
                            <span style={invalid}
                                  className="invalid">{t(validation.message)}</span>) : (showSuccessValidation === true ?
                            <span className="text-success">{t(validation.message)}</span> : '')) : ''
                    }
                </div>
            </div>
        )
    }
};


