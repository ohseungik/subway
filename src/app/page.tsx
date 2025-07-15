"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, RefreshCw, Train, Clock, MapPin, ArrowUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SubwayArrival {
  subwayId: string
  updnLine: string
  trainLineNm: string
  statnNm: string
  barvlDt: string
  btrainSttus: string
  bstatnNm: string
  recptnDt: string
  arvlMsg2: string
  arvlMsg3: string
  arvlCd: string
}

interface ApiResponse {
  status?: number
  code?: string
  message?: string
  link?: string
  developerMessage?: string
  total?: number
  errorMessage?: {
    status: number
    code: string
    message: string
    link: string
    developerMessage: string
    total: number
  }
  realtimeArrivalList: SubwayArrival[]
}

export default function SubwayApp() {
  const [stationName, setStationName] = useState("서울")
  const [arrivalData, setArrivalData] = useState<SubwayArrival[]>([])
  const [loading, setLoading] = useState(false)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [filterLine, setFilterLine] = useState<string>("all")
  const [filterDirection, setFilterDirection] = useState<string>("all")
  const [showScrollToTopButton, setShowScrollToTopButton] = useState(false)

  const [page, setPage] = useState(0)
  const itemsPerPage = 20
  const [hasMore, setHasMore] = useState(true)

  const observerTarget = useRef<HTMLDivElement>(null)

  const fetchSubwayData = useCallback(
    async (station: string, currentPage: number, isLoadMore: boolean) => {
      if (!station.trim()) return

      if (isLoadMore) {
        setIsFetchingMore(true)
      } else {
        setLoading(true)
        setArrivalData([])
        setPage(0)
        setHasMore(true)
      }
      setError(null)

      try {
        const encodedStation = encodeURIComponent(station)
        // currentPage와 itemsPerPage를 API 라우트로 전달
        const response = await fetch(
          `/api/subway?station=${encodedStation}&currentPage=${currentPage}&itemsPerPage=${itemsPerPage}`,
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error("API 응답 오류:", errorText)
          throw new Error(`서버 오류 (${response.status}): 데이터를 가져올 수 없습니다`)
        }

        const data: ApiResponse = await response.json()

        const apiStatus = data.errorMessage?.code || data.code
        const apiMessage = data.errorMessage?.message || data.message
        const apiTotal = data.errorMessage?.total || data.total

        if (apiStatus && apiStatus !== "INFO-000") {
          throw new Error(apiMessage || "알 수 없는 오류가 발생했습니다")
        }

        const newArrivals = data.realtimeArrivalList || []

        if (isLoadMore) {
          setArrivalData((prevData) => [...prevData, ...newArrivals])
        } else {
          setArrivalData(newArrivals)
          setFilterLine("all")
          setFilterDirection("all")
        }

        // 현재까지 로드된 데이터 수와 총 데이터 수를 비교하여 hasMore 업데이트
        setHasMore(arrivalData.length + newArrivals.length < (apiTotal || 0))
        setPage(currentPage + 1)
        setLastUpdated(new Date())

        if (newArrivals.length === 0 && !isLoadMore) {
          setError(`'${station}' 역의 실시간 정보를 찾을 수 없습니다. 역 이름을 확인해주세요.`)
        }
      } catch (err) {
        console.error("데이터 가져오기 오류:", err)
        setError(err instanceof Error ? err.message : "오류가 발생했습니다")
        if (!isLoadMore) setArrivalData([])
        setHasMore(false)
      } finally {
        if (isLoadMore) {
          setIsFetchingMore(false)
        } else {
          setLoading(false)
        }
      }
    },
    [arrivalData.length, itemsPerPage], // itemsPerPage를 의존성 배열에 추가
  )

  const handleSearch = () => {
    setArrivalData([])
    setPage(0)
    setHasMore(true)
    fetchSubwayData(stationName, 0, false)
  }

  const handleRefresh = () => {
    setArrivalData([])
    setPage(0)
    setHasMore(true)
    fetchSubwayData(stationName, 0, false)
  }

  const getLineColor = (subwayId: string) => {
    const colors: { [key: string]: string } = {
      "1001": "bg-blue-500",
      "1002": "bg-green-500",
      "1003": "bg-orange-500",
      "1004": "bg-sky-500",
      "1005": "bg-purple-500",
      "1006": "bg-amber-600",
      "1007": "bg-lime-600",
      "1008": "bg-pink-500",
      "1009": "bg-yellow-600",
    }
    return colors[subwayId] || "bg-gray-500"
  }

  const getStatusColor = (arvlCd: string) => {
    switch (arvlCd) {
      case "0":
        return "text-red-600"
      case "1":
        return "text-orange-600"
      case "2":
        return "text-blue-600"
      case "3":
        return "text-green-600"
      case "4":
        return "text-purple-600"
      case "5":
        return "text-gray-600"
      default:
        return "text-gray-600"
    }
  }

  const formatArrivalTime = (barvlDt: string, arvlCd: string) => {
    const totalSeconds = Number.parseInt(barvlDt)

    if (arvlCd === "1") return "도착"
    if (arvlCd === "0") return "진입"

    if (totalSeconds <= 0) return "곧 도착"

    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    let result = ""
    if (minutes > 0) {
      result += `${minutes}분 `
    }
    if (seconds > 0) {
      result += `${seconds}초 `
    }

    return result.trim() + " 후"
  }

  const filteredArrivals = useMemo(() => {
    let currentData = arrivalData

    if (filterLine !== "all") {
      currentData = currentData.filter((arrival) => arrival.trainLineNm === filterLine)
    }

    if (filterDirection !== "all") {
      currentData = currentData.filter((arrival) => arrival.updnLine === filterDirection)
    }

    return currentData
  }, [arrivalData, filterLine, filterDirection])

  const filterLineOptions = useMemo(() => {
    const options = new Set<string>()
    arrivalData.forEach((arrival) => options.add(arrival.trainLineNm))
    return ["all", ...Array.from(options).sort()]
  }, [arrivalData])

  const filterDirectionOptions = useMemo(() => {
    const options = new Set<string>()
    arrivalData.forEach((arrival) => options.add(arrival.updnLine))
    return ["all", ...Array.from(options).sort()]
  }, [arrivalData])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !isFetchingMore && arrivalData.length > 0) {
          fetchSubwayData(stationName, page, true)
        }
      },
      { threshold: 1.0 },
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [hasMore, loading, isFetchingMore, page, stationName, fetchSubwayData, arrivalData.length])

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollToTopButton(true)
      } else {
        setShowScrollToTopButton(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  useEffect(() => {
    fetchSubwayData(stationName, 0, false)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
            <Train className="h-8 w-8 text-blue-600" />
            서울 지하철 실시간 정보
          </h1>
          <p className="text-gray-600">실시간 지하철 도착 정보를 확인하세요</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />역 검색
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="역 이름을 입력하세요 (예: 서울, 강남, 홍대입구)"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading || isFetchingMore}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                검색
              </Button>
              <Button variant="outline" onClick={handleRefresh} disabled={loading || isFetchingMore}>
                <RefreshCw className={`h-4 w-4 ${loading || isFetchingMore ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {arrivalData.length > 0 && (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">열차:</span>
                  <Select value={filterLine} onValueChange={setFilterLine}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="모든 열차" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterLineOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === "all" ? "모든 열차" : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">방향:</span>
                  <Select value={filterDirection} onValueChange={setFilterDirection}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="모든 방향" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterDirectionOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === "all" ? "모든 방향" : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {lastUpdated && (
          <div className="text-center text-sm text-gray-500 mb-4 flex items-center justify-center gap-1">
            <Clock className="h-4 w-4" />
            마지막 업데이트: {lastUpdated.toLocaleTimeString("ko-KR")}
          </div>
        )}

        {loading && arrivalData.length === 0 ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">데이터를 불러오는 중...</p>
          </div>
        ) : filteredArrivals.length > 0 ? (
          <div className="space-y-4">
            {filteredArrivals.map((arrival, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-start gap-2">
                      <Badge className={`${getLineColor(arrival.subwayId)} text-white px-3 py-1`}>
                        {arrival.trainLineNm}
                      </Badge>
                      <div>
                        <div className="font-semibold text-gray-900">{arrival.updnLine} 방향</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {arrival.bstatnNm} 방면
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-lg ${getStatusColor(arrival.arvlCd)}`}>
                        {formatArrivalTime(arrival.barvlDt, arrival.arvlCd)}
                      </div>
                      <div className="text-sm text-gray-600">{arrival.btrainSttus}</div>
                    </div>
                  </div>
                  {arrival.arvlMsg2 && (
                    <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">{arrival.arvlMsg2}</div>
                  )}
                </CardContent>
              </Card>
            ))}
            {/* 무한 스크롤을 위한 옵저버 대상 */}
            {hasMore && (
              <div ref={observerTarget} className="py-4 text-center">
                {isFetchingMore && <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />}
              </div>
            )}
            {!hasMore && arrivalData.length > 0 && !isFetchingMore && (
              <div className="py-4 text-center text-gray-500 text-sm">더 이상 데이터가 없습니다.</div>
            )}
          </div>
        ) : (
          !loading &&
          !error && (
            <div className="text-center py-12">
              <Train className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">검색 결과가 없습니다.</p>
              <p className="text-sm text-gray-500 mt-1">다른 역 이름으로 검색해보세요.</p>
            </div>
          )
        )}
      </div>

      {/* 맨 위로 스크롤 버튼 */}
      {showScrollToTopButton && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-all duration-300 ease-in-out hover:scale-110"
          size="icon"
        >
          <ArrowUp className="h-6 w-6" />
          <span className="sr-only">맨 위로 스크롤</span>
        </Button>
      )}
    </div>
  )
}
