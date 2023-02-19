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
import { Button } from "../elements/button";

const HomePage = () => {

    const dispatch = useAppDispatch()

    let [fileLineView, setFileLineView] = useState(false)

    let token = useAppSelector(s => s.token.token)
    let [fileList, setFileList] = useState([{ name: "!~!~", isdir: false, size: 0 }])
    let [fileIsLoad, setFileIsLoad] = useState(true)

    let [currPath, setCurrPath] = useState("")
    let [fileCount, setFileCount] = useState({ file: 0, dir: 0 })
    let [footerText, setFooterText] = useState("")
    let [dirIsEmpty, setDirIsEmpty] = useState(false)

    let [newDirModal, setnewDirModal] = useState(false)
    let [newDirName, setNewDirName] = useState("")
    let [newDirErr, setNewDirErr] = useState("")

    const loadFiles = (path: string) => {
        let pathX = currPath === "/" ? currPath + path : currPath + "/" + path
        loadFilesPath(pathX)
    }

    const reloadFiles = () => loadFilesPath(currPath)

    const loadFilesPath = (path: string) => {
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

        setFooterText((cwdPath[cwdPath.length - 1] || "Home") + " • " + fileCountDes)
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

    // file load effect lock
    let fileLoadLock = useRef(false)
    useEffect(() => {
        if (!fileLoadLock.current) {
            fileLoadLock.current = true
            return
        }
        loadFiles("")
    }, [])

    return (
        <div className="files-con">
            <FilesHeader
                path={currPath}
                setFilesCB={loadFilesPath}
                fileUploadEvent={uploadFile}
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
                        <div className={`files-list ${fileLineView && `line-view`}`}>
                            {fileList.map(e => {
                                if (!e["name"].startsWith(".")) {
                                    let size = byteSize(e["size"])
                                    return <FileItem name={e["name"]} icon={e["isdir"] ? "folder" : "file"}
                                        onClick={() => {
                                            if (e["isdir"]) {
                                                loadFiles(e["name"])
                                            }
                                        }}
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
                    <span className="input-error" style={{ display: newDirErr != "" ? "block" : "none" }}>{newDirErr}</span>
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
        </div>
    )
}

export default HomePage
