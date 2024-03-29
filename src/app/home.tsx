import React, { useEffect, useRef, useState } from "react";
import FileFooter from "../components/filesFooter";
import FilesHeader from "../components/filesHeader";
import { FileItem, FileItemSpace } from "../components/filesList";
import API from "../conf/api";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { setConnError } from "../state/connErrorSlices";
import byteSize from "byte-size"
import Modal from "../elements/modal";
import { Input } from "../elements/input";
import { Button, IconButton, IconButtonLink, IconButtonSquare } from "../elements/button";
import { current } from "@reduxjs/toolkit";
import { useNavigate } from "react-router-dom";
import ReactPlayer from 'react-player'
import url from "../conf/url";

type HomePageProp = {
    thisTrash: boolean
    initPath?: string
}

enum copyOrCut {
    Copy,
    Cut,
    Unknow
}

const HomePage = ({ thisTrash, initPath }: HomePageProp) => {

    let navigate = useNavigate()

    const dispatch = useAppDispatch()

    let [fileLineView, setFileLineView] = useState(false)

    let token = useAppSelector(s => s.token.token)
    let [fileList, setFileList] = useState([{ name: "!~!~", isdir: false, size: 0, mod_time: "" }])
    let [fileIsLoad, setFileIsLoad] = useState(true)

    let [currPath, setCurrPath] = useState("")
    let [fileCount, setFileCount] = useState({ file: 0, dir: 0 })

    let [footerText, setFooterText] = useState("")
    let [dirIsEmpty, setDirIsEmpty] = useState(false)

    let [newDirModal, setnewDirModal] = useState(false)
    let [newDirName, setNewDirName] = useState("")
    let [newDirErr, setNewDirErr] = useState("")

    let [conMenuPorp, setConMenuPorp] = useState({ top: 0, left: 0, display: "none", transform: "" })
    let [activeMenuFile, setActiveMenuFile] = useState({ name: "!~!~", isdir: false, size: 0, mod_time: "" })

    let [viewReModal, setViewReModal] = useState(false)
    let [renameFileName, setRenameFileName] = useState("")
    let [renameFileErr, setRenameFileErr] = useState("")

    let [deleteFileModal, setDeleteFileModal] = useState(false)

    let [copyOrCutFilePath, setCopyOrCutFilePath] = useState({ path: "", file: "", copyOrCut: copyOrCut.Unknow })

    let [showViewCon, setShowWiewCon] = useState(false)

    let [showFileName, setShowFileName] = useState("")

    const videoPlayerRef = React.useRef<any>(null);

    const loadFiles = (path: string) => {
        let pathX = currPath === "/" ? currPath + path : currPath + "/" + path
        loadFilesPath(pathX)
    }

    const reloadFiles = () => loadFilesPath(currPath)

    const loadFilesPath = (path: string) => {

        ["/Pictures", "/Videos", "/Music", "/Documents"].map((e) => {
            if (path.startsWith(e)) {
                navigate(e.toLowerCase())
            }
        })

        setDirIsEmpty(false)
        setFileIsLoad(true)
        API.post(
            "/files/", {
            token: token,
            path: path
        }).then(r => {

            if (r.data.status) {
                setFileList(r.data.filelist)
                let fCount = 0
                let dCount = 0
                r.data.filelist.map((e: any) => {
                    if (!e["name"].startsWith(".")) {
                        if (e["isdir"]) {
                            dCount++
                        } else {
                            fCount++
                        }
                    }
                })
                if (r.data.filelist.length === 0 || (r.data.filelist.length === 1 && r.data.filelist[0]["name"] === "!~!~") || (dCount === 0 && fCount === 0)) {
                    setDirIsEmpty(true)
                }
                setFileCount({ dir: dCount, file: fCount })
                setFileIsLoad(false)
                setDirText(fCount, dCount, path)
            } else {
                dispatch(setConnError())
            }

            setCurrPath(path)

        }).catch(e => {
            dispatch(setConnError())
        })
    }

    // set dir footer text
    const setDirText = (fCount: number, dCount: number, path: string) => {
        let fileCountDes = ""
        if (fCount === 0 && dCount === 0) {
            fileCountDes = "Empty Directory"
        } else if (fCount !== 0 && dCount !== 0) {
            fileCountDes = `${fCount} ${fCount > 1 ? `Files` : `File`} and ${dCount} ${dCount > 1 ? `Directories` : `Directory`}`
        } else if (dCount === 0 && fCount !== 0) {
            fileCountDes = `${fCount} ${fCount > 1 ? `Files` : `File`}`
        } else if (dCount !== 0 && fCount === 0) {
            fileCountDes = `${dCount} ${dCount > 1 ? `Directories` : `Directory`}`
        }

        let cwdPath = path.split('/')

        setFooterText((thisTrash && cwdPath[cwdPath.length - 1] == ".delete" ? "Trash" : cwdPath[cwdPath.length - 1] || "Home") + " • " + fileCountDes)
    }

    const uploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        let file = e.target.files && e.target.files[0]
        if (!file) {
            return
        }
        const fileUploadFormData = new FormData();
        fileUploadFormData.append("token", token)
        fileUploadFormData.append("base_path", currPath)
        fileUploadFormData.append("file", file)
        API.post(
            "/files/upload",
            fileUploadFormData,
            { headers: { "Content-Type": "multipart/form-data" }, }
        ).then(r => {
            if (r.data.status) {
                reloadFiles()
            } else {
                dispatch(setConnError())
            }
        }).catch(e => {
            dispatch(setConnError())
        })
    }

    const createNewDir = () => {
        if (newDirName === "") {
            setNewDirErr("Please enter folder name")
            return
        }

        if (newDirName[0] === ".") {
            setNewDirErr(`\`${newDirName}\` is system reserved name`)
            return
        }

        let dirIsExist = false
        fileList.map(e => {
            if (e.name === newDirName) {
                dirIsExist = true
                setNewDirErr(`\`${newDirName}\` folder already exist`)
                return
            }
        })
        if (dirIsExist) return;

        if (newDirName.match("/")) {
            setNewDirErr(`\`/\`restricted character in folder name`)
            return
        }

        API.post(
            "/files/newdir", {
            token: token,
            dir_name: newDirName,
            base_path: currPath
        }).then(r => {
            if (r.data.status) {
                setnewDirModal(false)
                reloadFiles()
            } else {
                dispatch(setConnError())
            }
        }).catch(e => {
            dispatch(setConnError())
        })

        setNewDirErr("")

    }

    const fileContextMenu = (e: any, filename: any) => {
        setActiveMenuFile(filename)
        setConMenuPorp({
            top: e.clientY,
            left: e.clientX,
            display: "block",
            transform: `translate(-${window.innerWidth < e.clientX + 200 ? "100" : "0"}%, -${window.innerHeight < e.clientY + 210 ? "100" : "0"}%)`,
        })
    }

    const renameFile = () => {

        if (renameFileName === "") {
            setRenameFileErr("Please enter new name")
            return
        }

        if (renameFileName[0] === ".") {
            setRenameFileErr(`\`${renameFileName}\` is system reserved name`)
            return
        }

        let dirIsExist = false
        fileList.map(e => {
            if (e.name === renameFileName) {
                dirIsExist = true
                setRenameFileErr(`\`${renameFileName}\` file or folder already exist`)
                return
            }
        })
        if (dirIsExist) return;

        if (newDirName.match("/")) {
            setRenameFileErr(`\`/\`restricted character in file or folder name`)
            return
        }

        API.post(
            "/files/rename", {
            token: token,
            old_file_name: activeMenuFile.name,
            new_file_name: renameFileName,
            base_path: currPath
        }).then(r => {
            if (r.data.status) {
                setViewReModal(false)
                reloadFiles()
            } else {
                dispatch(setConnError())
            }
            setRenameFileName("")
        }).catch(e => {
            dispatch(setConnError())
        })

    }

    const copyOrCutFile = (cut: boolean) => {
        setCopyOrCutFilePath({
            path: currPath,
            file: activeMenuFile.name,
            copyOrCut: cut ? copyOrCut.Cut : copyOrCut.Copy
        })
    }

    const pasteFile = () => {
        console.log(copyOrCutFilePath, currPath);
        API.post(
            "/files/copy", {
            token: token,
            file: copyOrCutFilePath.file,
            old_path: copyOrCutFilePath.path,
            new_path: currPath,
            cut: copyOrCutFilePath.copyOrCut == copyOrCut.Cut
        }).then(r => {
            if (r.data.status) {
                setCopyOrCutFilePath({
                    path: "",
                    file: "",
                    copyOrCut: copyOrCut.Unknow
                })
                reloadFiles()
            } else {
                dispatch(setConnError())
            }
        }).catch(e => {
            dispatch(setConnError())
        })
    }

    const deleteFile = () => {
        API.post(
            "/files/delete", {
            token: token,
            file_name: activeMenuFile.name,
            base_path: currPath,
            permanent: thisTrash,
        }).then(r => {
            if (r.data.status) {
                setDeleteFileModal(false)
                reloadFiles()
            } else {
                dispatch(setConnError())
            }
        }).catch(e => {
            dispatch(setConnError())
        })
    }

    const showView = (fileName: string): boolean => {
        let isValid = false;
        ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.mp4'].map((e) => {
            if (fileName.toLowerCase().endsWith(e)) {
                isValid = true
                return
            }
        })

        return isValid
    }

    const viewFile = (file: string) => {
        let fileName = currPath + "/" + file
        setShowFileName(fileName)
        setShowWiewCon(true)
        videoPlayerRef.current.load()

        if (fileName.toLowerCase().endsWith(".mp4")) {
            videoPlayerRef.current.play()
        }
    }

    const fileClickEvent = (e: any) => {

        if (e["isdir"]) {
            loadFiles(e["name"])
            return
        }

        if (showView(e["name"])) {
            setActiveMenuFile(e)
            viewFile(e["name"])
            return
        }

        window.open(`${url.back}api/files/view?file=${currPath + "/" + e["name"]}&token=${token}&download=true`);

    }

    // file load effect lock
    let fileLoadLock = useRef(false)
    useEffect(() => {
        if (!fileLoadLock.current) {
            fileLoadLock.current = true
            return
        }
        loadFilesPath(!thisTrash ? (initPath || "/") : "/.delete")
    }, [thisTrash, initPath])

    return (
        <div
            className="files-con"
            onClick={() => setConMenuPorp({ top: 0, left: 0, display: "none", transform: "" })}
            onContextMenu={() => conMenuPorp.display == "block" && setConMenuPorp({ top: 0, left: 0, display: "none", transform: "" })}
        >
            <FilesHeader
                copyState={copyOrCutFilePath.path != ""}
                thisTrash={thisTrash}
                path={currPath}
                setFilesCB={loadFilesPath}
                fileUploadEvent={uploadFile}
                pasteFilesCB={pasteFile}
                newDirEvent={() => {
                    setNewDirName("");
                    setnewDirModal(true)
                    setNewDirErr("")
                }}
                changeLayout={(setLineView) => {
                    setFileLineView(setLineView)
                }}
            />
            <div className="files-con-main">
                {(() => {
                    if (fileIsLoad) {
                        return (
                            <div className="loading-dir">
                                <div>
                                    <div className="spinner"></div>
                                </div>
                            </div>
                        )
                    }
                    if (dirIsEmpty) {
                        return (
                            <div className="empty-dir">
                                <div>
                                    <i className="bi bi-folder-fill"></i>
                                    <br />
                                    <span>Folder Is Empty</span>
                                </div>
                            </div>
                        )
                    }
                    return (
                        <div>
                            <div className="context-menu" style={conMenuPorp}>
                                {activeMenuFile["isdir"] && <IconButton
                                    ivc={true}
                                    active={false}
                                    name="Open"
                                    icon={<i className="bi bi-box-arrow-up-right"></i>}
                                    onClick={() => {
                                        activeMenuFile["isdir"] && loadFiles(activeMenuFile["name"])
                                    }}
                                />}
                                {!activeMenuFile["isdir"] && showView(activeMenuFile["name"]) && <IconButton
                                    ivc={true}
                                    active={false}
                                    name="View"
                                    icon={<i className="bi bi-eye"></i>}
                                    onClick={() => viewFile(activeMenuFile["name"])}
                                />}
                                {!activeMenuFile["isdir"] && <IconButtonLink
                                    ivc={true}
                                    active={false}
                                    name="Download"
                                    icon={<i className="bi bi-download"></i>}
                                    href={`${url.back}api/files/view?file=${currPath + "/" + activeMenuFile["name"]}&download=true&token=${token}`}
                                />}
                                {!thisTrash &&
                                    <>
                                        <IconButton
                                            ivc={true}
                                            active={false}
                                            name="Rename"
                                            icon={<i className="bi bi-pencil-square"></i>}
                                            onClick={() => {
                                                setRenameFileName(activeMenuFile.name)
                                                setViewReModal(true)
                                                setRenameFileErr("")
                                            }}
                                        />
                                        <IconButton
                                            ivc={true}
                                            active={false}
                                            name="Copy"
                                            icon={<i className="bi bi-clipboard"></i>}
                                            onClick={() => {
                                                copyOrCutFile(false)
                                            }}
                                        />
                                    </>
                                }
                                <IconButton
                                    ivc={true}
                                    active={false}
                                    name="Cut"
                                    icon={<i className="bi bi-scissors"></i>}
                                    onClick={() => {
                                        copyOrCutFile(true)
                                    }}
                                />
                                <IconButton
                                    ivc={true}
                                    active={false}
                                    name="Delete"
                                    icon={<i className="bi bi-trash3-fill"></i>}
                                    onClick={() => {
                                        setDeleteFileModal(true)
                                    }}
                                />
                            </div>

                            <div className={`files-list ${fileLineView && `line-view`}`}>
                                {fileList.map(e => {
                                    if (!e["name"].startsWith(".")) {
                                        let size = byteSize(e["size"])
                                        return <FileItem
                                            modTime={e["mod_time"]}
                                            name={e["name"]}
                                            iconType={e["isdir"] ? 1 : 0}
                                            fileName={e["name"]}
                                            onClick={() => fileClickEvent(e)}
                                            onContextMenu={(event) => fileContextMenu(event, e)}
                                            onMouseEnter={() => setFooterText(`${e["name"]} • ${e["isdir"] ? `Directory` : `File • ${size.value} ${size.unit}`}`)}
                                            onMouseLeave={() => setDirText(fileCount.file, fileCount.dir, currPath)}
                                        />
                                    }
                                    return null
                                })}
                                {!fileLineView && (() => {
                                    let fsa: JSX.Element[] = [];
                                    for (let i = 0; i < 15; i++) {
                                        fsa.push(<FileItemSpace />);
                                    }
                                    return fsa;
                                })()}
                            </div>
                        </div>
                    )
                })()}
            </div>
            <FileFooter des={footerText} />
            <Modal show={newDirModal} title={"New Folder"} des={
                <>
                    <Input
                        value={newDirName}
                        className="m-0"
                        type="text"
                        placeholder="Folder Name"
                        onChange={(e: any) => {
                            setNewDirName(e.target.value)
                            setNewDirErr("")
                        }}
                    />
                    <span className="input-error" style={{ display: newDirErr !== "" ? "block" : "none" }}>{newDirErr}</span>
                </>
            } button={
                <>
                    <Button
                        name="Cancel"
                        onClick={() => setnewDirModal(false)}
                    />
                    <Button
                        name="Create"
                        primary={true}
                        onClick={createNewDir}
                    />
                </>
            } onClose={() => setnewDirModal(false)} />
            <Modal
                show={viewReModal}
                title={"Rename"}
                des={
                    <>
                        <Input
                            value={renameFileName}
                            className="m-0"
                            type="text"
                            placeholder={activeMenuFile.name}
                            onChange={(e: any) => {
                                setRenameFileName(e.target.value)
                                setRenameFileErr("")
                            }}
                        />
                        <span className="input-error" style={{ display: renameFileErr !== "" ? "block" : "none" }}>{renameFileErr}</span>
                    </>
                }
                button={
                    <>
                        <Button
                            name="Cancel"
                            onClick={() => setViewReModal(false)}
                        />
                        <Button
                            name="Rename"
                            primary={true}
                            onClick={() => renameFile()}
                        />
                    </>
                }
                onClose={() => setViewReModal(false)}
            />
            <Modal
                show={deleteFileModal}
                title={"Delete"}
                des={`Are you sure to ${thisTrash ? "permanent" : ""} delete \`${activeMenuFile.name}\``}
                button={
                    <>
                        <Button
                            name="Cancel"
                            onClick={() => setDeleteFileModal(false)}
                        />
                        <Button
                            name="Delete"
                            primary={true}
                            onClick={() => deleteFile()}
                        />
                    </>
                }
                onClose={() => setDeleteFileModal(false)}
            />
            <div className="view-file" style={{ display: showViewCon ? "block" : "none" }}>
                <div className="close-button">
                    <IconButtonSquare icon={<i className="bi bi-x-lg"></i>} onClick={() => {
                        setShowWiewCon(false)
                        videoPlayerRef.current.pause()
                    }} />
                </div>
                {showFileName.toLowerCase().endsWith(".pdf") ?
                    <iframe src={`${url.back}api/files/view?file=${showFileName}&token=${token}`} style={{ width: "100%", height: "100%" }} />
                    :
                    (
                        showFileName.toLowerCase().endsWith(".mp4") ?
                            <video ref={videoPlayerRef} id="videoPlayer" controls style={{ height: "100%", width: "100%" }}>
                                <source src={`${url.back}api/files/view?file=${showFileName}&token=${token}`} type="video/mp4" />Your browser does not support the video tag. I suggest you upgrade your browser.
                            </video>
                            :
                            <img style={{ width: "100%", height: "100%", objectFit: "contain" }} src={`${url.back}api/files/view?file=${showFileName}&token=${token}`} />
                    )}

            </div>
        </div>
    )
}

export default HomePage
