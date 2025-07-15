"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, RefreshCw, Train, Clock, MapPin } from "lucide-react"
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
  errorMessage: {
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
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [filterLine, setFilterLine] = useState<string>("all") // 필터링 상태 추가

  const fetchSubwayData = async (station: string) => {
    if (!station.trim()) return

    setLoading(true)
    setError(null)
    setArrivalData([]) // 새로운 검색 시 데이터 초기화

    try {
      const encodedStation = encodeURIComponent(station)
      const response = await fetch(`/api/subway?station=${encodedStation}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API 응답 오류:", errorText)
        throw new Error(`서버 오류 (${response.status}): 데이터를 가져올 수 없습니다`)
      }

      const data: ApiResponse = await response.json()

      if (data.errorMessage && data.errorMessage.code !== "INFO-000") {
        throw new Error(data.errorMessage.message || "알 수 없는 오류가 발생했습니다")
      }

      if (!data.realtimeArrivalList || data.realtimeArrivalList.length === 0) {
        throw new Error(`'${station}' 역의 실시간 정보를 찾을 수 없습니다. 역 이름을 확인해주세요.`)
      }

      setArrivalData(data.realtimeArrivalList)
      setLastUpdated(new Date())
      setFilterLine("all") // 새로운 검색 시 필터 초기화
    } catch (err) {
      console.error("데이터 가져오기 오류:", err)
      setError(err instanceof Error ? err.message : "오류가 발생했습니다")
      setArrivalData([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchSubwayData(stationName)
  }

  const handleRefresh = () => {
    fetchSubwayData(stationName)
  }

  const getLineColor = (subwayId: string) => {
    const colors: { [key: string]: string } = {
      "1001": "bg-blue-500", // 1호선
      "1002": "bg-green-500", // 2호선
      "1003": "bg-orange-500", // 3호선
      "1004": "bg-sky-500", // 4호선
      "1005": "bg-purple-500", // 5호선
      "1006": "bg-amber-600", // 6호선
      "1007": "bg-olive-600", // 7호선
      "1008": "bg-pink-500", // 8호선
      "1009": "bg-yellow-600", // 9호선
    }
    return colors[subwayId] || "bg-gray-500"
  }

  const getStatusColor = (arvlCd: string) => {
    switch (arvlCd) {
      case "0":
        return "text-red-600" // 진입
      case "1":
        return "text-orange-600" // 도착
      case "2":
        return "text-blue-600" // 출발
      case "3":
        return "text-green-600" // 전역출발
      case "4":
        return "text-purple-600" // 전역진입
      case "5":
        return "text-gray-600" // 전역도착
      default:
        return "text-gray-600"
    }
  }

  const formatArrivalTime = (barvlDt: string, arvlCd: string) => {
    const totalSeconds = Number.parseInt(barvlDt)

    if (arvlCd === "1") return "도착" // 도착
    if (arvlCd === "0") return "진입" // 진입

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

  // 필터링된 열차 목록
  const filteredArrivals = useMemo(() => {
    if (filterLine === "all") {
      return arrivalData
    }
    return arrivalData.filter((arrival) => arrival.trainLineNm === filterLine)
  }, [arrivalData, filterLine])

  // 필터링 옵션 (고유한 trainLineNm 목록)
  const filterOptions = useMemo(() => {
    const options = new Set<string>()
    arrivalData.forEach((arrival) => options.add(arrival.trainLineNm))
    return ["all", ...Array.from(options).sort()]
  }, [arrivalData])

  useEffect(() => {
    fetchSubwayData(stationName)
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
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                검색
              </Button>
              <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {arrivalData.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">필터:</span>
                <Select value={filterLine} onValueChange={setFilterLine}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="모든 열차" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === "all" ? "모든 열차" : option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          </div>
        ) : (
          !loading && (
            <div className="text-center py-12">
              <Train className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">검색 결과가 없습니다.</p>
              <p className="text-sm text-gray-500 mt-1">다른 역 이름으로 검색해보세요.</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
