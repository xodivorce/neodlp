import clsx from "clsx";
import { ProxyImage } from "@/components/custom/proxyImage";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/providers/appContextProvider";
import { useCurrentVideoMetadataStore, useDownloaderPageStatesStore, useSettingsPageStatesStore } from "@/services/store";
import { determineFileType, fileFormatFilter, formatBitrate, formatDurationString, formatFileSize, formatReleaseDate, formatYtStyleCount, isObjEmpty, sortByBitrate } from "@/utils";
import { Calendar, Clock, DownloadCloud, Eye, Info, Loader2, Music, ThumbsUp, Video, File, ListVideo, PackageSearch, AlertCircleIcon, X } from "lucide-react";
import { FormatSelectionGroup, FormatSelectionGroupItem } from "@/components/custom/formatSelectionGroup";
import { useEffect, useRef } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/custom/legacyToggleGroup";
import { VideoFormat } from "@/types/video";
// import { PlaylistToggleGroup, PlaylistToggleGroupItem } from "@/components/custom/playlistToggleGroup";
import { PlaylistSelectionGroup, PlaylistSelectionGroupItem } from "@/components/custom/playlistSelectionGroup";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { config } from "@/config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { invoke } from "@tauri-apps/api/core";

const searchFormSchema = z.object({
    url: z.url({
        error: (issue) => issue.input === undefined || issue.input === null || issue.input === ""
        ? "URL is required"
        : "Invalid URL format"
    }),
});

export default function DownloaderPage() {
    const { fetchVideoMetadata, startDownload } = useAppContext();
    const { toast } = useToast();
    
    const videoUrl = useCurrentVideoMetadataStore((state) => state.videoUrl);
    const videoMetadata = useCurrentVideoMetadataStore((state) => state.videoMetadata);
    const isMetadataLoading = useCurrentVideoMetadataStore((state) => state.isMetadataLoading);
    const requestedUrl = useCurrentVideoMetadataStore((state) => state.requestedUrl);
    const autoSubmitSearch = useCurrentVideoMetadataStore((state) => state.autoSubmitSearch);
    const searchPid = useCurrentVideoMetadataStore((state) => state.searchPid);
    const setVideoUrl = useCurrentVideoMetadataStore((state) => state.setVideoUrl);
    const setVideoMetadata = useCurrentVideoMetadataStore((state) => state.setVideoMetadata);
    const setIsMetadataLoading = useCurrentVideoMetadataStore((state) => state.setIsMetadataLoading);
    const setRequestedUrl = useCurrentVideoMetadataStore((state) => state.setRequestedUrl);
    const setAutoSubmitSearch = useCurrentVideoMetadataStore((state) => state.setAutoSubmitSearch);
    const setSearchPid = useCurrentVideoMetadataStore((state) => state.setSearchPid);
    const setShowSearchError = useCurrentVideoMetadataStore((state) => state.setShowSearchError);

    const activeDownloadModeTab = useDownloaderPageStatesStore((state) => state.activeDownloadModeTab);
    const isStartingDownload = useDownloaderPageStatesStore((state) => state.isStartingDownload);
    const selectedDownloadFormat = useDownloaderPageStatesStore((state) => state.selectedDownloadFormat);
    const selectedCombinableVideoFormat = useDownloaderPageStatesStore((state) => state.selectedCombinableVideoFormat);
    const selectedCombinableAudioFormat = useDownloaderPageStatesStore((state) => state.selectedCombinableAudioFormat);
    const selectedSubtitles = useDownloaderPageStatesStore((state) => state.selectedSubtitles);
    const selectedPlaylistVideoIndex = useDownloaderPageStatesStore((state) => state.selectedPlaylistVideoIndex);
    const setActiveDownloadModeTab = useDownloaderPageStatesStore((state) => state.setActiveDownloadModeTab);
    const setIsStartingDownload = useDownloaderPageStatesStore((state) => state.setIsStartingDownload);
    const setSelectedDownloadFormat = useDownloaderPageStatesStore((state) => state.setSelectedDownloadFormat);
    const setSelectedCombinableVideoFormat = useDownloaderPageStatesStore((state) => state.setSelectedCombinableVideoFormat);
    const setSelectedCombinableAudioFormat = useDownloaderPageStatesStore((state) => state.setSelectedCombinableAudioFormat);
    const setSelectedSubtitles = useDownloaderPageStatesStore((state) => state.setSelectedSubtitles);
    const setSelectedPlaylistVideoIndex = useDownloaderPageStatesStore((state) => state.setSelectedPlaylistVideoIndex);

    const videoFormat = useSettingsPageStatesStore(state => state.settings.video_format);
    const audioFormat = useSettingsPageStatesStore(state => state.settings.audio_format);
    
    const audioOnlyFormats = videoMetadata?._type === 'video' ? sortByBitrate(videoMetadata?.formats.filter(fileFormatFilter('audio'))) : videoMetadata?._type === 'playlist' ? sortByBitrate(videoMetadata?.entries[Number(selectedPlaylistVideoIndex) - 1].formats.filter(fileFormatFilter('audio'))) : [];
    const videoOnlyFormats = videoMetadata?._type === 'video' ? sortByBitrate(videoMetadata?.formats.filter(fileFormatFilter('video'))) : videoMetadata?._type === 'playlist' ? sortByBitrate(videoMetadata?.entries[Number(selectedPlaylistVideoIndex) - 1].formats.filter(fileFormatFilter('video'))) : [];
    const combinedFormats = videoMetadata?._type === 'video' ? sortByBitrate(videoMetadata?.formats.filter(fileFormatFilter('video+audio'))) : videoMetadata?._type === 'playlist' ? sortByBitrate(videoMetadata?.entries[Number(selectedPlaylistVideoIndex) - 1].formats.filter(fileFormatFilter('video+audio'))) : [];

    const av1VideoFormats = videoMetadata?.webpage_url_domain === 'youtube.com' && videoMetadata?._type === 'video' ? sortByBitrate(videoMetadata?.formats.filter((format) => format.vcodec?.startsWith('av01'))) : videoMetadata?.webpage_url_domain === 'youtube.com' && videoMetadata?._type === 'playlist' ? sortByBitrate(videoMetadata?.entries[Number(selectedPlaylistVideoIndex) - 1].formats.filter((format) => format.vcodec?.startsWith('av01'))) : [];
    const opusAudioFormats = videoMetadata?.webpage_url_domain === 'youtube.com' && videoMetadata?._type === 'video' ? sortByBitrate(videoMetadata?.formats.filter((format) => format.acodec?.startsWith('opus'))) : videoMetadata?.webpage_url_domain === 'youtube.com' && videoMetadata?._type === 'playlist' ? sortByBitrate(videoMetadata?.entries[Number(selectedPlaylistVideoIndex) - 1].formats.filter((format) => format.acodec?.startsWith('opus'))) : [];
    const qualityPresetFormats: VideoFormat[] | undefined = videoMetadata?.webpage_url_domain === 'youtube.com' ?
        av1VideoFormats && opusAudioFormats ?
            av1VideoFormats.map((av1Format) => {
                const opusFormat = av1Format.format_note.startsWith('144p') || av1Format.format_note.startsWith('240p') ? opusAudioFormats[opusAudioFormats.length - 1] : opusAudioFormats[0]
                return {
                    ...av1Format,
                    format: `${av1Format.format}+${opusFormat?.format}`,
                    format_id: `${av1Format.format_id}+${opusFormat?.format_id}`,
                    format_note: `${av1Format.format_note}+${opusFormat?.format_note}`,
                    filesize_approx: av1Format.filesize_approx && opusFormat.filesize_approx ? av1Format.filesize_approx + opusFormat.filesize_approx : null,
                    acodec: opusFormat?.acodec,
                    audio_ext: opusFormat.audio_ext,
                    ext: 'webm',
                    tbr: av1Format.tbr && opusFormat.tbr ? av1Format.tbr + opusFormat.tbr : null,
                };
            })
        : []
    : [];

    const allFilteredFormats = [...(audioOnlyFormats || []), ...(videoOnlyFormats || []), ...(combinedFormats || []), ...(qualityPresetFormats || [])];
    const selectedFormat = (() => {
        if (videoMetadata?._type === 'video') {
            if (selectedDownloadFormat === 'best') {
                return videoMetadata?.requested_downloads[0];
            }
            return allFilteredFormats.find(
                (format) => format.format_id === selectedDownloadFormat
            );
        } else if (videoMetadata?._type === 'playlist') {
            if (selectedDownloadFormat === 'best') {
                return videoMetadata?.entries[Number(selectedPlaylistVideoIndex) - 1].requested_downloads[0];
            }
            return allFilteredFormats.find(
                (format) => format.format_id === selectedDownloadFormat
            );
        }
    })();
    const selectedFormatFileType = determineFileType(selectedFormat?.vcodec, selectedFormat?.acodec);
    const selectedVideoFormat = (() => {
        if (videoMetadata?._type === 'video') {
            return allFilteredFormats.find(
                (format) => format.format_id === selectedCombinableVideoFormat
            );
        } else if (videoMetadata?._type === 'playlist') {
            return allFilteredFormats.find(
                (format) => format.format_id === selectedCombinableVideoFormat
            );
        }
    })();
    const selectedAudioFormat = (() => {
        if (videoMetadata?._type === 'video') {
            return allFilteredFormats.find(
                (format) => format.format_id === selectedCombinableAudioFormat
            );
        } else if (videoMetadata?._type === 'playlist') {
            return allFilteredFormats.find(
                (format) => format.format_id === selectedCombinableAudioFormat
            );
        }
    })();

    const subtitles = videoMetadata?._type === 'video' ? (videoMetadata?.subtitles || {}) : videoMetadata?._type === 'playlist' ? (videoMetadata?.entries[Number(selectedPlaylistVideoIndex) - 1].subtitles || {}) : {};
    const subtitleLanguages = Object.keys(subtitles).map(langCode => ({
        code: langCode,
        lang: subtitles[langCode][0].name || langCode
    }));

    const containerRef = useRef<HTMLDivElement>(null);
    const bottomBarRef = useRef<HTMLDivElement>(null);

    let selectedFormatExtensionMsg = 'Auto - unknown';
    if (activeDownloadModeTab === 'combine') {
        if (videoFormat !== 'auto') {
            selectedFormatExtensionMsg = `Combined - ${videoFormat.toUpperCase()}`;
        }
        else if (selectedAudioFormat?.ext && selectedVideoFormat?.ext) {
            selectedFormatExtensionMsg = `Combined - ${selectedVideoFormat.ext.toUpperCase()} + ${selectedAudioFormat.ext.toUpperCase()}`;
        } else {
            selectedFormatExtensionMsg = `Combined - unknown`;
        }
    } else if (selectedFormat?.ext) {
        if ((selectedFormatFileType === 'video+audio' || selectedFormatFileType === 'video') && videoFormat !== 'auto') {
            selectedFormatExtensionMsg = `Forced - ${videoFormat.toUpperCase()}`;
        } else if (selectedFormatFileType === 'audio' && audioFormat !== 'auto') {
            selectedFormatExtensionMsg = `Forced - ${audioFormat.toUpperCase()}`;
        } else {
            selectedFormatExtensionMsg = `Auto - ${selectedFormat.ext.toUpperCase()}`;
        }
    }

    let selectedFormatResolutionMsg = 'unknown';
    if (activeDownloadModeTab === 'combine') {
        selectedFormatResolutionMsg = `${selectedVideoFormat?.resolution ?? 'unknown'} + ${selectedAudioFormat?.tbr ? formatBitrate(selectedAudioFormat.tbr) : 'unknown'}`;
    } else if (selectedFormat?.resolution) {
        selectedFormatResolutionMsg = selectedFormat.resolution;
    }

    let selectedFormatDynamicRangeMsg = '';
    if (activeDownloadModeTab === 'combine') {
        selectedFormatDynamicRangeMsg = selectedVideoFormat?.dynamic_range && selectedVideoFormat.dynamic_range !== 'SDR' ? selectedVideoFormat.dynamic_range : '';
    } else if (selectedFormat?.dynamic_range && selectedFormat.dynamic_range !== 'SDR') {
        selectedFormatDynamicRangeMsg = selectedFormat.dynamic_range;
    }

    let selectedFormatFileSizeMsg = 'unknown filesize';
    if (activeDownloadModeTab === 'combine') {
        selectedFormatFileSizeMsg = selectedVideoFormat?.filesize_approx && selectedAudioFormat?.filesize_approx ? formatFileSize(selectedVideoFormat.filesize_approx + selectedAudioFormat.filesize_approx) : 'unknown filesize';
    } else if (selectedFormat?.filesize_approx) {
        selectedFormatFileSizeMsg = formatFileSize(selectedFormat.filesize_approx);
    }

    let selectedFormatFinalMsg = '';
    if (activeDownloadModeTab === 'combine') {
        if (selectedCombinableVideoFormat && selectedCombinableAudioFormat) {
            selectedFormatFinalMsg = `${selectedFormatExtensionMsg} (${selectedFormatResolutionMsg}) ${selectedFormatDynamicRangeMsg} ${selectedSubtitles.length > 0 ? `• ESUB` : ''} • ${selectedFormatFileSizeMsg}`;
        } else {
            selectedFormatFinalMsg = `Choose a video and audio stream to combine`;
        }
    } else {
        if (selectedFormat) {
            selectedFormatFinalMsg = `${selectedFormatExtensionMsg} (${selectedFormatResolutionMsg}) ${selectedFormatDynamicRangeMsg} ${selectedSubtitles.length > 0 ? `• ESUB` : ''} • ${selectedFormatFileSizeMsg}`;
        } else {
            selectedFormatFinalMsg = `Choose a stream to download`;
        }
    }

    const searchForm = useForm<z.infer<typeof searchFormSchema>>({
        resolver: zodResolver(searchFormSchema),
        defaultValues: {
          url: videoUrl,
        },
        mode: "onChange",
    })
    const watchedUrl = searchForm.watch("url");
    const { errors: searchFormErrors } = searchForm.formState;

    function handleSearchSubmit(values: z.infer<typeof searchFormSchema>) {
        setVideoMetadata(null);
        setSearchPid(null);
        setShowSearchError(true);
        setIsMetadataLoading(true);
        setSelectedDownloadFormat('best');
        setSelectedCombinableVideoFormat('');
        setSelectedCombinableAudioFormat('');
        setSelectedSubtitles([]);
        setSelectedPlaylistVideoIndex('1');

        fetchVideoMetadata(values.url).then((metadata) => {
            if (!metadata || (metadata._type !== 'video' && metadata._type !== 'playlist') || (metadata && metadata._type === 'video' && metadata.formats.length <= 0) || (metadata && metadata._type === 'playlist' && metadata.entries.length <= 0)) {
                const showSearchError = useCurrentVideoMetadataStore.getState().showSearchError;
                if (showSearchError) {
                    toast({
                        title: 'Oops! No results found',
                        description: 'The provided URL does not contain any downloadable content or you are not connected to the internet. Please check the URL, your network connection and try again.',
                        variant: "destructive"
                    });
                }
            }
            if (metadata && (metadata._type === 'video' || metadata._type === 'playlist') && ((metadata._type === 'video' && metadata.formats.length > 0) || (metadata._type === 'playlist' && metadata.entries.length > 0))) setVideoMetadata(metadata);
            if (metadata) console.log(metadata);
            setIsMetadataLoading(false);
        });
    }

    const cancelSearch = async (pid: number | null) => {
        setShowSearchError(false);
        if (pid) {
            console.log("Killing process with PID:", pid);
            await invoke('kill_all_process', { pid: pid });
        }
        setVideoMetadata(null);
        setIsMetadataLoading(false);
    };

    useEffect(() => {
        const updateBottomBarWidth = (): void => {
            if (containerRef.current && bottomBarRef.current) {
                bottomBarRef.current.style.width = `${containerRef.current.offsetWidth}px`;
                const containerRect = containerRef.current.getBoundingClientRect();
                bottomBarRef.current.style.left = `${containerRect.left}px`;
            }
        };
        updateBottomBarWidth();
        const resizeObserver = new ResizeObserver(() => {
            updateBottomBarWidth();
        });
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        window.addEventListener('resize', updateBottomBarWidth);
        window.addEventListener('scroll', updateBottomBarWidth);
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateBottomBarWidth);
            window.removeEventListener('scroll', updateBottomBarWidth);
        };
    }, []);

    useEffect(() => {
        if (watchedUrl !== videoUrl) {
            setVideoUrl(watchedUrl);
        }
    }, [watchedUrl, videoUrl, setVideoUrl]);

    useEffect(() => {
        const handleAutoSubmitRequest = async () => {
            // Update form and state when requestedUrl changes
            if (requestedUrl && requestedUrl !== searchForm.getValues("url") && !isMetadataLoading) {
                searchForm.setValue("url", requestedUrl);
                setVideoUrl(requestedUrl);
            }
            
            // Auto-submit the form if the flag is set
            if (autoSubmitSearch && requestedUrl) {
                if (!isMetadataLoading) {
                    // trigger a validation check on the URL field first then get the result
                    await searchForm.trigger("url");
                    const isValidUrl = !searchForm.getFieldState("url").invalid;
                    
                    if (isValidUrl) {
                        // Reset the flag first to prevent loops
                        setAutoSubmitSearch(false);
                        
                        // Submit the form with a small delay to ensure UI is ready
                        setTimeout(() => {
                            handleSearchSubmit({ url: requestedUrl });
                            setRequestedUrl('');
                        }, 300);
                    } else {
                        // If URL is invalid, just reset the flag
                        setAutoSubmitSearch(false);
                        setRequestedUrl('');
                        toast({
                            title: 'Invalid URL',
                            description: 'The provided URL is not valid.',
                            variant: "destructive"
                        });
                    }
                } else {
                    // If metadata is loading, just reset the flag
                    setAutoSubmitSearch(false);
                    setRequestedUrl('');
                    toast({
                        title: 'Search in progress',
                        description: 'Search in progress, try again later.',
                        variant: "destructive"
                    });
                }
            } else {
                // If auto-submit is not set, reset the flag
                setAutoSubmitSearch(false);
                setRequestedUrl('');
            }
        }
        handleAutoSubmitRequest();
    }, [requestedUrl, autoSubmitSearch, isMetadataLoading]);

    // useEffect(() => {
    //     console.log("Selected playlist items:", selectedVideos)
    // }), [selectedVideos]

    return (
        <div className="container mx-auto p-4 space-y-4 relative" ref={containerRef}>
            <Card className="gap-4">
                <CardHeader>
                    <CardTitle className="flex items-center"><PackageSearch className="size-5 mr-3" />{config.appName} Search</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Form {...searchForm}>
                        <form onSubmit={searchForm.handleSubmit(handleSearchSubmit)} className="flex gap-2 w-full" autoComplete="off">
                            <FormField
                                control={searchForm.control}
                                name="url"
                                disabled={isMetadataLoading}
                                render={({ field }) => (
                                    <FormItem className="w-full">
                                        <FormControl>
                                            <Input
                                            className="focus-visible:ring-0"
                                            placeholder="Enter Video URL to Search"
                                            {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {isMetadataLoading && (
                                <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                disabled={!isMetadataLoading}
                                onClick={() => cancelSearch(searchPid)}
                                >
                                    <X className="size-4" />
                                </Button>
                            )}
                            <Button
                                type="submit"
                                disabled={!videoUrl || Object.keys(searchFormErrors).length > 0 || isMetadataLoading}
                            >
                                {isMetadataLoading ? (
                                    <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Searching
                                    </>
                                ) : (
                                    'Search'
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            {!isMetadataLoading && videoMetadata && videoMetadata._type === 'video' && (       // === Single Video ===
            <div className="flex">
                <div className="flex flex-col w-[55%] border-r border-border pr-4">
                    <h3 className="text-sm mb-4 mt-2 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        <span>Metadata</span>
                    </h3>
                    <div className="flex flex-col overflow-y-scroll max-h-[50vh] no-scrollbar">
                        <AspectRatio ratio={16 / 9} className={clsx("w-full rounded-lg overflow-hidden mb-2 border border-border", videoMetadata.aspect_ratio && videoMetadata.aspect_ratio === 0.56 && "relative")}>
                            <ProxyImage src={videoMetadata.thumbnail} alt="thumbnail" className={clsx(videoMetadata.aspect_ratio && videoMetadata.aspect_ratio === 0.56 && "absolute h-full w-auto top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2")} />
                        </AspectRatio>
                        <h2 className="mb-1">{videoMetadata.title ? videoMetadata.title : 'UNTITLED'}</h2>
                        <p className="text-muted-foreground text-xs mb-2">{videoMetadata.channel || videoMetadata.uploader || 'unknown'}</p>
                        <div className="flex items-center mb-2">
                            <span className="text-xs text-muted-foreground flex items-center pr-3"><Clock className="w-4 h-4 mr-2"/> {videoMetadata.duration_string ? formatDurationString(videoMetadata.duration_string) : 'unknown'}</span>
                            <Separator orientation="vertical" />
                            <span className="text-xs text-muted-foreground flex items-center px-3"><Eye className="w-4 h-4 mr-2"/> {videoMetadata.view_count ? formatYtStyleCount(videoMetadata.view_count) : 'unknown'}</span>
                            <Separator orientation="vertical" />
                            <span className="text-xs text-muted-foreground flex items-center pl-3"><ThumbsUp className="w-4 h-4 mr-2"/> {videoMetadata.like_count ? formatYtStyleCount(videoMetadata.like_count) : 'unknown'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4" />
                            <span className="">{videoMetadata.upload_date ? formatReleaseDate(videoMetadata.upload_date) : 'unknown'}</span>
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs mb-2">
                            {videoMetadata.resolution && (
                                <span className="border border-border py-1 px-2 rounded">{videoMetadata.resolution}</span>
                            )}
                            {videoMetadata.tbr && (
                                <span className="border border-border py-1 px-2 rounded">{formatBitrate(videoMetadata.tbr)}</span>
                            )}
                            {videoMetadata.fps && (
                                <span className="border border-border py-1 px-2 rounded">{videoMetadata.fps} fps</span>
                            )}
                            {videoMetadata.subtitles && !isObjEmpty(videoMetadata.subtitles) && (
                                <span className="border border-border py-1 px-2 rounded">SUB</span>
                            )}
                            {videoMetadata.dynamic_range && videoMetadata.dynamic_range !== 'SDR' && (
                                <span className="border border-border py-1 px-2 rounded">{videoMetadata.dynamic_range}</span>
                            )}
                        </div>
                        <div className="flex items-center text-muted-foreground">
                            <Info className="w-3 h-3 mr-2" />
                            <span className="text-xs">Extracted from {videoMetadata.extractor ? videoMetadata.extractor.charAt(0).toUpperCase() + videoMetadata.extractor.slice(1) : 'Unknown'}</span>
                        </div>
                        <div className="spacer mb-10"></div>
                    </div>
                </div>
                <div className="flex flex-col w-full pl-4">
                    <Tabs
                    className=""
                    value={activeDownloadModeTab}
                    onValueChange={(tab) => setActiveDownloadModeTab(tab)}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm flex items-center gap-2">
                                <DownloadCloud className="w-4 h-4" />
                                <span>Download Options</span>
                            </h3>
                            <TabsList>
                                <TabsTrigger value="selective">Selective</TabsTrigger>
                                <TabsTrigger value="combine">Combine</TabsTrigger>
                            </TabsList>
                        </div>
                        <TabsContent value="selective">
                            <div className="flex flex-col overflow-y-scroll max-h-[50vh] no-scrollbar">
                                {subtitles && !isObjEmpty(subtitles) && (
                                    <ToggleGroup
                                    type="multiple"
                                    variant="outline"
                                    className="flex flex-col items-start gap-2 mb-2"
                                    value={selectedSubtitles}
                                    onValueChange={(value) => setSelectedSubtitles(value)}
                                    // disabled={selectedFormat?.ext !== 'mp4' && selectedFormat?.ext !== 'mkv' && selectedFormat?.ext !== 'webm'}
                                    >
                                        <p className="text-xs">Subtitle Languages</p>
                                        <div className="flex gap-2 flex-wrap items-center">
                                            {subtitleLanguages.map((lang) => (
                                                <ToggleGroupItem
                                                className="text-xs text-nowrap border-2 data-[state=on]:border-2 data-[state=on]:border-primary data-[state=on]:bg-muted/70 hover:bg-muted/70"
                                                value={lang.code}
                                                size="sm"
                                                aria-label={lang.lang}
                                                key={lang.code}>
                                                    {lang.lang}
                                                </ToggleGroupItem>
                                            ))}
                                        </div>
                                    </ToggleGroup>
                                )}
                                <FormatSelectionGroup
                                value={selectedDownloadFormat}
                                onValueChange={(value) => {
                                    setSelectedDownloadFormat(value);
                                    // const currentlySelectedFormat = value === 'best' ? videoMetadata?.requested_downloads[0] : allFilteredFormats.find((format) => format.format_id === value);
                                    // if (currentlySelectedFormat?.ext !== 'mp4' && currentlySelectedFormat?.ext !== 'mkv' && currentlySelectedFormat?.ext !== 'webm') {
                                    //     setSelectedSubtitles([]);
                                    // }
                                }}
                                >
                                    <p className="text-xs">Suggested</p>
                                    <div className="">
                                        <FormatSelectionGroupItem
                                        key="best"
                                        value="best"
                                        format={videoMetadata.requested_downloads[0]}
                                        />
                                    </div>
                                    {qualityPresetFormats && qualityPresetFormats.length > 0 && (
                                    <>
                                        <p className="text-xs">Quality Presets</p>
                                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                                            {qualityPresetFormats.map((format) => (
                                                <FormatSelectionGroupItem
                                                key={format.format_id}
                                                value={format.format_id}
                                                format={format}
                                                />
                                            ))}
                                        </div>
                                    </>
                                    )}
                                    {audioOnlyFormats && audioOnlyFormats.length > 0 && (
                                    <>
                                        <p className="text-xs">Audio</p>
                                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                                            {audioOnlyFormats.map((format) => (
                                                <FormatSelectionGroupItem
                                                key={format.format_id}
                                                value={format.format_id}
                                                format={format}
                                                />
                                            ))}
                                        </div>
                                    </>
                                    )}
                                    {videoOnlyFormats && videoOnlyFormats.length > 0 && (
                                    <>
                                        <p className="text-xs">Video {videoOnlyFormats.every(format => format.acodec === 'none') ? '(no audio)' : ''}</p>
                                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                                            {videoOnlyFormats.map((format) => (
                                                <FormatSelectionGroupItem
                                                key={format.format_id}
                                                value={format.format_id}
                                                format={format}
                                                />
                                            ))}
                                        </div>
                                    </>
                                    )}
                                    {combinedFormats && combinedFormats.length > 0 && (
                                    <>
                                        <p className="text-xs">Video</p>
                                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                                            {combinedFormats.map((format) => (
                                                <FormatSelectionGroupItem
                                                key={format.format_id}
                                                value={format.format_id}
                                                format={format}
                                                />
                                            ))}
                                        </div>
                                    </>
                                    )}
                                </FormatSelectionGroup>
                                <div className="spacer mb-10"></div>
                            </div>
                        </TabsContent>
                        <TabsContent value="combine">
                            <div className="flex flex-col overflow-y-scroll max-h-[50vh] no-scrollbar">
                                {audioOnlyFormats && audioOnlyFormats.length > 0 && videoOnlyFormats && videoOnlyFormats.length > 0 && subtitles && !isObjEmpty(subtitles) && (
                                    <ToggleGroup
                                    type="multiple"
                                    variant="outline"
                                    className="flex flex-col items-start gap-2 mb-2"
                                    value={selectedSubtitles}
                                    onValueChange={(value) => setSelectedSubtitles(value)}
                                    >
                                        <p className="text-xs">Subtitle Languages</p>
                                        <div className="flex gap-2 flex-wrap items-center">
                                            {subtitleLanguages.map((lang) => (
                                                <ToggleGroupItem
                                                className="text-xs text-nowrap border-2 data-[state=on]:border-2 data-[state=on]:border-primary data-[state=on]:bg-muted/70 hover:bg-muted/70"
                                                value={lang.code}
                                                size="sm"
                                                aria-label={lang.lang}
                                                key={lang.code}>
                                                    {lang.lang}
                                                </ToggleGroupItem>
                                            ))}
                                        </div>
                                    </ToggleGroup>
                                )}
                                <FormatSelectionGroup
                                className="mb-2"
                                value={selectedCombinableAudioFormat}
                                onValueChange={(value) => {
                                    setSelectedCombinableAudioFormat(value);
                                }}
                                >
                                    {videoOnlyFormats && videoOnlyFormats.length > 0 && audioOnlyFormats && audioOnlyFormats.length > 0 && (
                                    <>
                                        <p className="text-xs">Audio</p>
                                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                                            {audioOnlyFormats.map((format) => (
                                                <FormatSelectionGroupItem
                                                key={format.format_id}
                                                value={format.format_id}
                                                format={format}
                                                />
                                            ))}
                                        </div>
                                    </>
                                    )}
                                </FormatSelectionGroup>
                                <FormatSelectionGroup
                                value={selectedCombinableVideoFormat}
                                onValueChange={(value) => {
                                    setSelectedCombinableVideoFormat(value);
                                }}
                                >
                                    {audioOnlyFormats && audioOnlyFormats.length > 0 && videoOnlyFormats && videoOnlyFormats.length > 0 && (
                                    <>
                                        <p className="text-xs">Video</p>
                                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                                            {videoOnlyFormats.map((format) => (
                                                <FormatSelectionGroupItem
                                                key={format.format_id}
                                                value={format.format_id}
                                                format={format}
                                                />
                                            ))}
                                        </div>
                                    </>
                                    )}
                                </FormatSelectionGroup>
                                {(!videoOnlyFormats || videoOnlyFormats.length === 0 || !audioOnlyFormats || audioOnlyFormats.length === 0) && (
                                    <Alert>
                                        <AlertCircleIcon />
                                        <AlertTitle>Unable to use Combine Mode!</AlertTitle>
                                        <AlertDescription>
                                            Cannot use combine mode for this video as it does not have both audio and video formats available. Use Selective Mode or try another video.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <div className="spacer mb-10"></div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
            )}
            {!isMetadataLoading && videoMetadata && videoMetadata._type === 'playlist' && (       // === Playlists ===
                <div className="flex">
                    <div className="flex flex-col w-[55%] border-r border-border pr-4">
                        <h3 className="text-sm mb-4 mt-2 flex items-center gap-2">
                            <ListVideo className="w-4 h-4" />
                            <span>Playlist ({videoMetadata.entries[0].n_entries})</span>
                        </h3>
                        <div className="flex flex-col overflow-y-scroll max-h-[50vh] no-scrollbar">
                            <h2 className="mb-1">{videoMetadata.entries[0].playlist_title ? videoMetadata.entries[0].playlist_title : 'UNTITLED'}</h2>
                            <p className="text-muted-foreground text-xs mb-4">{videoMetadata.entries[0].playlist_channel || videoMetadata.entries[0].playlist_uploader || 'unknown'}</p>
                            {/* <PlaylistToggleGroup
                                className="mb-2"
                                type="multiple"
                                value={selectedVideos}
                                onValueChange={setSelectedVideos}
                            >
                                {videoMetadata.entries.map((entry) => entry ? (
                                    <PlaylistToggleGroupItem
                                        key={entry.playlist_index} 
                                        value={entry.playlist_index.toString()}
                                        video={entry}
                                    />
                                ) : null)}
                            </PlaylistToggleGroup> */}
                            <PlaylistSelectionGroup
                            className="mb-2"
                            value={selectedPlaylistVideoIndex}
                            onValueChange={(value) => {
                                setSelectedPlaylistVideoIndex(value);
                                setSelectedDownloadFormat('best');
                                setSelectedSubtitles([]);
                                setSelectedCombinableVideoFormat('');
                                setSelectedCombinableAudioFormat('');
                            }}
                            >
                                {videoMetadata.entries.map((entry) => entry ? (
                                    <PlaylistSelectionGroupItem
                                    key={entry.playlist_index}
                                    value={entry.playlist_index.toString()}
                                    video={entry}
                                    />
                                ) : null)}
                            </PlaylistSelectionGroup>
                            <div className="flex items-center text-muted-foreground">
                                <Info className="w-3 h-3 mr-2" />
                                <span className="text-xs">Extracted from {videoMetadata.entries[0].extractor ? videoMetadata.entries[0].extractor.charAt(0).toUpperCase() + videoMetadata.entries[0].extractor.slice(1) : 'Unknown'}</span>
                            </div>
                            <div className="spacer mb-10"></div>
                        </div>
                    </div>
                    <div className="flex flex-col w-full pl-4">
                        <Tabs
                        className=""
                        value={activeDownloadModeTab}
                        onValueChange={(tab) => setActiveDownloadModeTab(tab)}
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm flex items-center gap-2">
                                    <DownloadCloud className="w-4 h-4" />
                                    <span>Download Options</span>
                                </h3>
                                <TabsList>
                                    <TabsTrigger value="selective">Selective</TabsTrigger>
                                    <TabsTrigger value="combine">Combine</TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value="selective">
                                <div className="flex flex-col overflow-y-scroll max-h-[50vh] no-scrollbar">
                                    {subtitles && !isObjEmpty(subtitles) && (
                                        <ToggleGroup
                                        type="multiple"
                                        variant="outline"
                                        className="flex flex-col items-start gap-2 mb-2"
                                        value={selectedSubtitles}
                                        onValueChange={(value) => setSelectedSubtitles(value)}
                                        disabled={selectedFormat?.ext !== 'mp4' && selectedFormat?.ext !== 'mkv' && selectedFormat?.ext !== 'webm'}
                                        >
                                            <p className="text-xs">Subtitle Languages</p>
                                            <div className="flex gap-2 flex-wrap items-center">
                                                {subtitleLanguages.map((lang) => (
                                                    <ToggleGroupItem
                                                    className="text-xs text-nowrap border-2 data-[state=on]:border-2 data-[state=on]:border-primary data-[state=on]:bg-muted/70 hover:bg-muted/70"
                                                    value={lang.code}
                                                    size="sm"
                                                    aria-label={lang.lang}
                                                    key={lang.code}>
                                                        {lang.lang}
                                                    </ToggleGroupItem>
                                                ))}
                                            </div>
                                        </ToggleGroup>
                                    )}
                                    <FormatSelectionGroup
                                    value={selectedDownloadFormat}
                                    onValueChange={(value) => {
                                        setSelectedDownloadFormat(value);
                                        const currentlySelectedFormat = value === 'best' ? videoMetadata?.entries[Number(value) - 1].requested_downloads[0] : allFilteredFormats.find((format) => format.format_id === value);
                                        if (currentlySelectedFormat?.ext !== 'mp4' && currentlySelectedFormat?.ext !== 'mkv' && currentlySelectedFormat?.ext !== 'webm') {
                                            setSelectedSubtitles([]);
                                        }
                                    }}
                                    >
                                        <p className="text-xs">Suggested</p>
                                        <div className="">
                                            <FormatSelectionGroupItem
                                            key="best"
                                            value="best"
                                            format={videoMetadata.entries[Number(selectedPlaylistVideoIndex) - 1].requested_downloads[0]}
                                            />
                                        </div>
                                        {qualityPresetFormats && qualityPresetFormats.length > 0 && (
                                        <>
                                            <p className="text-xs">Quality Presets</p>
                                            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                                                {qualityPresetFormats.map((format) => (
                                                    <FormatSelectionGroupItem
                                                    key={format.format_id}
                                                    value={format.format_id}
                                                    format={format}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                        )}
                                        {audioOnlyFormats && audioOnlyFormats.length > 0 && (
                                        <>
                                            <p className="text-xs">Audio</p>
                                            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                                                {audioOnlyFormats.map((format) => (
                                                    <FormatSelectionGroupItem
                                                    key={format.format_id}
                                                    value={format.format_id}
                                                    format={format}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                        )}
                                        {videoOnlyFormats && videoOnlyFormats.length > 0 && (
                                        <>
                                            <p className="text-xs">Video {videoOnlyFormats.every(format => format.acodec === 'none') ? '(no audio)' : ''}</p>
                                            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                                                {videoOnlyFormats.map((format) => (
                                                    <FormatSelectionGroupItem
                                                    key={format.format_id}
                                                    value={format.format_id}
                                                    format={format}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                        )}
                                        {combinedFormats && combinedFormats.length > 0 && (
                                        <>
                                            <p className="text-xs">Video</p>
                                            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                                                {combinedFormats.map((format) => (
                                                    <FormatSelectionGroupItem
                                                    key={format.format_id}
                                                    value={format.format_id}
                                                    format={format}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                        )}
                                    </FormatSelectionGroup>
                                    <div className="spacer mb-10"></div>
                                </div>
                            </TabsContent>
                            <TabsContent value="combine">
                                <div className="flex flex-col overflow-y-scroll max-h-[50vh] no-scrollbar">
                                    {audioOnlyFormats && audioOnlyFormats.length > 0 && videoOnlyFormats && videoOnlyFormats.length > 0 && subtitles && !isObjEmpty(subtitles) && (
                                        <ToggleGroup
                                        type="multiple"
                                        variant="outline"
                                        className="flex flex-col items-start gap-2 mb-2"
                                        value={selectedSubtitles}
                                        onValueChange={(value) => setSelectedSubtitles(value)}
                                        disabled={selectedFormat?.ext !== 'mp4' && selectedFormat?.ext !== 'mkv' && selectedFormat?.ext !== 'webm'}
                                        >
                                            <p className="text-xs">Subtitle Languages</p>
                                            <div className="flex gap-2 flex-wrap items-center">
                                                {subtitleLanguages.map((lang) => (
                                                    <ToggleGroupItem
                                                    className="text-xs text-nowrap border-2 data-[state=on]:border-2 data-[state=on]:border-primary data-[state=on]:bg-muted/70 hover:bg-muted/70"
                                                    value={lang.code}
                                                    size="sm"
                                                    aria-label={lang.lang}
                                                    key={lang.code}>
                                                        {lang.lang}
                                                    </ToggleGroupItem>
                                                ))}
                                            </div>
                                        </ToggleGroup>
                                    )}
                                    <FormatSelectionGroup
                                    className="mb-2"
                                    value={selectedCombinableAudioFormat}
                                    onValueChange={(value) => {
                                        setSelectedCombinableAudioFormat(value);
                                    }}
                                    >
                                        {videoOnlyFormats && videoOnlyFormats.length > 0 && audioOnlyFormats && audioOnlyFormats.length > 0 && (
                                        <>
                                            <p className="text-xs">Audio</p>
                                            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                                                {audioOnlyFormats.map((format) => (
                                                    <FormatSelectionGroupItem
                                                    key={format.format_id}
                                                    value={format.format_id}
                                                    format={format}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                        )}
                                    </FormatSelectionGroup>
                                    <FormatSelectionGroup
                                    value={selectedCombinableVideoFormat}
                                    onValueChange={(value) => {
                                        setSelectedCombinableVideoFormat(value);
                                    }}
                                    >
                                        {audioOnlyFormats && audioOnlyFormats.length > 0 && videoOnlyFormats && videoOnlyFormats.length > 0 && (
                                        <>
                                            <p className="text-xs">Video</p>
                                            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                                                {videoOnlyFormats.map((format) => (
                                                    <FormatSelectionGroupItem
                                                    key={format.format_id}
                                                    value={format.format_id}
                                                    format={format}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                        )}
                                    </FormatSelectionGroup>
                                    {(!videoOnlyFormats || videoOnlyFormats.length === 0 || !audioOnlyFormats || audioOnlyFormats.length === 0) && (
                                        <Alert>
                                            <AlertCircleIcon />
                                            <AlertTitle>Unable to use Combine Mode!</AlertTitle>
                                            <AlertDescription>
                                                Cannot use combine mode for this video as it does not have both audio and video formats available. Use Selective Mode or try another video.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    <div className="spacer mb-10"></div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            )}
            {!isMetadataLoading && videoMetadata && selectedDownloadFormat && (       // === Bottom Bar ===
                <div className="flex justify-between items-center gap-2 fixed bottom-0 right-0 p-4 w-full bg-background rounded-t-lg border-t border-border z-20" ref={bottomBarRef}>
                    <div className="flex items-center gap-4">
                        <div className="flex justify-center items-center p-3 rounded-md border border-border">
                            {selectedFormatFileType && (selectedFormatFileType === 'video' || selectedFormatFileType === 'video+audio') && (
                                <Video className="w-4 h-4" />
                            )}
                            {selectedFormatFileType && selectedFormatFileType === 'audio' && (
                                <Music className="w-4 h-4" />
                            )}
                            {(!selectedFormatFileType) || (selectedFormatFileType && selectedFormatFileType !== 'video' && selectedFormatFileType !== 'audio' && selectedFormatFileType !== 'video+audio') && (
                                <File className="w-4 h-4" />
                            )}
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-sm text-nowrap max-w-[30rem] xl:max-w-[50rem] overflow-hidden text-ellipsis">{videoMetadata._type === 'video' ? videoMetadata.title : videoMetadata._type === 'playlist' ? videoMetadata.entries[Number(selectedPlaylistVideoIndex) - 1].title : 'Unknown' }</span>
                            <span className="text-xs text-muted-foreground">{selectedFormatFinalMsg}</span>
                        </div>
                    </div>
                    <Button
                    onClick={async () => {
                        setIsStartingDownload(true);
                        try {
                            if (videoMetadata._type === 'playlist') {
                                await startDownload(
                                    videoMetadata.original_url,
                                    activeDownloadModeTab === 'combine' ? `${selectedCombinableVideoFormat}+${selectedCombinableAudioFormat}` : selectedDownloadFormat === 'best' ? videoMetadata.entries[Number(selectedPlaylistVideoIndex) - 1].requested_downloads[0].format_id : selectedDownloadFormat,
                                    selectedSubtitles.length > 0 ? selectedSubtitles.join(',') : null,
                                    undefined,
                                    selectedPlaylistVideoIndex
                                );
                            } else if (videoMetadata._type === 'video') {
                                await startDownload(
                                    videoMetadata.webpage_url,
                                    activeDownloadModeTab === 'combine' ? `${selectedCombinableVideoFormat}+${selectedCombinableAudioFormat}` : selectedDownloadFormat === 'best' ? videoMetadata.requested_downloads[0].format_id : selectedDownloadFormat,
                                    selectedSubtitles.length > 0 ? selectedSubtitles.join(',') : null
                                );
                            }
                            // toast({
                            //     title: 'Download Initiated',
                            //     description: 'Download initiated, it will start shortly.',
                            // });
                        } catch (error) {
                            console.error('Download failed to start:', error);
                            toast({
                                title: 'Failed to Start Download',
                                description: 'There was an error initiating the download.',
                                variant: "destructive"
                            });
                        } finally {
                            setIsStartingDownload(false);
                        }
                    }}
                    disabled={isStartingDownload || !selectedDownloadFormat || (activeDownloadModeTab === 'combine' && (!selectedCombinableVideoFormat || !selectedCombinableAudioFormat))}
                    >
                        {isStartingDownload ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Starting Download
                            </>
                        ) : (
                            'Start Download'
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}