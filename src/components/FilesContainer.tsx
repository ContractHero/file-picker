import React, { Fragment, useEffect, useState } from 'react'
import { Waypoint } from 'react-waypoint'
import useSWRInfinite from 'swr/infinite'
import { File } from '../types/File'
import { useDebounce } from '../utils/useDebounce'
import { usePrevious } from '../utils/usePrevious'
import Breadcrumbs from './Breadcrumbs'
import FileDetails from './FileDetails'
import FilesTable from './FilesTable'
import LoadingTable from './LoadingTable'
import Search from './Search'
import SlideOver from './SlideOver'

interface Props {
  /**
   * The ID of your Unify application
   */
  appId: string
  /**
   * The ID of the consumer which you want to fetch files from
   */
  consumerId: string
  /**
   * The ID of the selected connector, for example "google-drive"
   */
  serviceId: string
  /**
   * The JSON Web Token returned from the Create Session call
   */
  jwt: string
  /**
   * The function that gets called when a file is selected
   */
  onSelect: (file: File) => any
}

const FilesContainer = ({ appId, consumerId, jwt, serviceId, onSelect }: Props) => {
  const [folderId, setFolderId] = useState<null | string>('root')
  const [folders, setFolders] = useState<File[]>([])
  const [file, setFile] = useState<null | File>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<File[]>()
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const debouncedSearchTerm = useDebounce(searchTerm)
  const prevServiceId = usePrevious(serviceId)
  const searchMode = debouncedSearchTerm?.length
  const headers = {
    'Content-Type': 'application/json',
    'x-apideck-auth-type': 'JWT',
    'x-apideck-app-id': appId,
    'x-apideck-consumer-id': consumerId,
    'x-apideck-service-id': serviceId,
    Authorization: `Bearer ${jwt}`
  }

  const fetcher = async (url: string) => {
    const response = await fetch(url, { headers })
    return await response.json()
  }

  const getKey = (pageIndex: number, previousPage: any) => {
    const filterParams =
      folderId === 'shared' ? 'filter[shared]=true' : `filter[folder_id]=${folderId}`
    const fileUrl = `https://unify.apideck.com/file-storage/files?limit=30&${filterParams}`

    if (previousPage && !previousPage?.data?.length) return null
    if (pageIndex === 0) return fileUrl

    const cursor = previousPage?.meta?.cursors?.next

    return `${fileUrl}&cursor=${cursor}`
  }

  const { data, setSize, size, error } = useSWRInfinite(getKey, fetcher, {
    shouldRetryOnError: false
  })

  const nextPage = () => {
    const nextCursor = data?.length && data[data.length - 1]?.meta?.cursors?.next

    if (nextCursor) {
      setSize(size + 1)
    }
  }

  useEffect(() => {
    if (prevServiceId && prevServiceId !== serviceId) {
      setSize(0)
    }
  }, [serviceId, prevServiceId])

  const handleSelect = (file: File) => {
    if (file.type === 'folder') {
      setFolderId(file.id)
      if (searchMode) {
        setSearchTerm('')
        setIsSearchVisible(false)
        setFolders([file])
      } else {
        setFolders([...folders, file])
      }
    }

    if (file.type === 'file') {
      setFile(file)
    }
  }

  const handleBreadcrumbClick = (file?: File) => {
    if (file) {
      setFolderId(file.id)
      const index = folders.indexOf(file)
      const newArray = [...folders.slice(0, index + 1)]
      setFolders(newArray)
    } else {
      setFolderId('root')
      setFolders([])
    }
  }

  const filesError = error || (data?.length && data[data.length - 1]?.error)
  const isLoading = !data && !error
  const isLoadingMore = size > 0 && data && typeof data[size - 1] === 'undefined'

  let files = data?.map((page) => page?.data).flat() || []

  // Add Google Drive shared folder to root
  if (folderId === 'root' && data?.length && serviceId === 'google-drive') {
    const sharedFolder = { id: 'shared', name: 'Shared with me', type: 'folder' }
    if (files?.length) {
      files = [sharedFolder, ...files]
    } else {
      files.push(sharedFolder)
    }
  }

  useEffect(() => {
    if (debouncedSearchTerm?.length) {
      setIsSearching(true)

      const searchFiles = async () => {
        const url = 'https://unify.apideck.com/file-storage/files/search'
        const options = {
          headers,
          method: 'POST',
          body: JSON.stringify({ query: debouncedSearchTerm })
        }

        const response = await fetch(url, options)
        return response.json()
      }

      searchFiles()
        .then((result) => {
          setSearchResults(result.data)
        })
        .finally(() => setIsSearching(false))
    }
  }, [debouncedSearchTerm])

  const handleSearch = (text: string) => {
    console.log(text)
    setSearchTerm(text)
  }

  return (
    <Fragment>
      <div
        className={`relative flex items-center mb-1 ${
          folders?.length ? 'justify-between' : 'justify-end'
        }`}
      >
        <Breadcrumbs folders={folders} handleClick={handleBreadcrumbClick} />
        <Search
          onChange={handleSearch}
          searchTerm={searchTerm}
          isSearchVisible={isSearchVisible}
          setIsSearchVisible={setIsSearchVisible}
        />
      </div>
      {!isSearching && searchMode && !searchResults?.length ? (
        <p className="py-4 text-center text-gray-700">No results found</p>
      ) : null}
      {isLoading || isSearching ? (
        <LoadingTable />
      ) : (
        <FilesTable
          data={searchMode && searchResults ? searchResults : files}
          handleSelect={handleSelect}
          isLoadingMore={isLoadingMore}
        />
      )}
      {!isLoading ? (
        <SlideOver open={!!file}>
          <FileDetails file={file} setFile={setFile} onSelect={onSelect} />
        </SlideOver>
      ) : null}
      {!isLoading && error ? (
        <p className="text-red-600">{filesError?.message || filesError}</p>
      ) : null}
      {files?.length && !isLoadingMore && !searchMode ? (
        <div className="flex flex-row-reverse py-4 border-gray-200">
          <Waypoint onEnter={() => nextPage()} />
        </div>
      ) : null}
    </Fragment>
  )
}

export default FilesContainer
