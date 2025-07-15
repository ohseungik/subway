import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const station = searchParams.get("station")
  const currentPage = Number.parseInt(searchParams.get("currentPage") || "0") // currentPage를 직접 받음
  const itemsPerPage = Number.parseInt(searchParams.get("itemsPerPage") || "20") // itemsPerPage를 직접 받음

  if (!station) {
    return NextResponse.json(
      {
        status: 400,
        code: "ERROR-001",
        message: "역 이름이 필요합니다",
        link: "",
        developerMessage: "",
        total: 0,
        realtimeArrivalList: [],
      },
      { status: 400 },
    )
  }

  const SUBWAY_API_KEY = process.env.NEXT_PUBLIC_SUBWAY_API_KEY
  if (!SUBWAY_API_KEY) {
    console.error("NEXT_PUBLIC_SUBWAY_API_KEY 환경 변수가 설정되지 않았습니다.")
    return NextResponse.json(
      {
        status: 500,
        code: "API_KEY_MISSING",
        message: "API 키가 설정되지 않았습니다. Vercel 환경 변수를 확인해주세요.",
        link: "",
        developerMessage: "NEXT_PUBLIC_SUBWAY_API_KEY is not set.",
        total: 0,
        realtimeArrivalList: [],
      },
      { status: 500 },
    )
  }

  try {
    // 1-based 인덱스로 계산
    const beginRow = currentPage * itemsPerPage + 1
    const endRow = beginRow + itemsPerPage - 1

    const apiUrl = `http://swopenapi.seoul.go.kr/api/subway/${SUBWAY_API_KEY}/json/realtimeStationArrival/${beginRow}/${endRow}/${encodeURIComponent(station)}`

    console.log("API URL:", apiUrl)

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; SubwayApp/1.0)",
      },
    })

    console.log("Response status:", response.status)
    console.log("Response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API 호출 실패 응답:", errorText)
      throw new Error(`API 호출 실패: ${response.status} - ${errorText.substring(0, 100)}...`)
    }

    const responseText = await response.text()
    console.log("Response text (first 500 chars):", responseText.substring(0, 500))

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("JSON 파싱 오류:", parseError)
      console.error("Response text:", responseText)

      if (responseText.includes("<html") || responseText.includes("<!DOCTYPE")) {
        throw new Error(
          "API에서 HTML 응답을 반환했습니다. 서비스가 일시적으로 중단되었거나 API 키가 유효하지 않을 수 있습니다.",
        )
      }

      throw new Error("API 응답을 파싱할 수 없습니다")
    }

    const finalData = data.errorMessage ? data : { ...data, total: data.realtimeArrivalList?.length || 0 }

    return NextResponse.json(finalData)
  } catch (error) {
    return NextResponse.json(
      {
        status: 500,
        code: "API_ERROR",
        message: error instanceof Error ? error.message : "지하철 정보를 가져오는데 실패했습니다",
        link: "",
        developerMessage: "",
        total: 0,
        realtimeArrivalList: [],
      },
      { status: 500 },
    )
  }
}
