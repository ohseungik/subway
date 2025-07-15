import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const station = searchParams.get("station")

  if (!station) {
    return NextResponse.json(
      {
        errorMessage: {
          status: 400,
          code: "ERROR-001",
          message: "역 이름이 필요합니다",
          link: "",
          developerMessage: "",
          total: 0,
        },
        realtimeArrivalList: [],
      },
      { status: 400 },
    )
  }

  try {
    // 서울시 지하철 실시간 도착정보 API 호출
    const apiUrl = `http://swopenapi.seoul.go.kr/api/subway/sample/json/realtimeStationArrival/0/5/${encodeURIComponent(station)}`

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`)
    }

    console.log("API 응답 상태:", response.status)

    const responseText = await response.text()

    // JSON 파싱 시도
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("JSON 파싱 오류:", parseError)
      console.error("Response text:", responseText)

      // HTML 응답인 경우 (에러 페이지)
      if (responseText.includes("<html") || responseText.includes("<!DOCTYPE")) {
        throw new Error("API에서 HTML 응답을 반환했습니다. 서비스가 일시적으로 중단되었을 수 있습니다.")
      }

      throw new Error("API 응답을 파싱할 수 없습니다")
    }

    // 원본 데이터를 그대로 반환
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      {
        errorMessage: {
          status: 500,
          code: "API_ERROR",
          message: error instanceof Error ? error.message : "지하철 정보를 가져오는데 실패했습니다",
          link: "",
          developerMessage: "",
          total: 0,
        },
        realtimeArrivalList: [],
      },
      { status: 500 },
    )
  }
}
