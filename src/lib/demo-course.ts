import { materializeCourse, type Course, type CurriculumDraft, type Source } from "./types";

const sources: Source[] = [
  { id: "docker-containers", title: "Docker 공식 문서 · 컨테이너란?", url: "https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/", summary: "컨테이너의 격리된 실행 환경과 가상 머신과의 차이를 설명합니다." },
  { id: "docker-images", title: "Docker 공식 문서 · 이미지란?", url: "https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/", summary: "이미지의 구성과 여러 컨테이너에서 이미지를 재사용하는 방식을 설명합니다." },
  { id: "docker-run", title: "Docker 공식 문서 · 컨테이너 실행", url: "https://docs.docker.com/engine/containers/run/", summary: "docker run의 이미지 참조, 이름, 백그라운드 실행, 네트워크와 마운트 옵션을 다룹니다." },
  { id: "docker-logs", title: "Docker 공식 문서 · 컨테이너 로그", url: "https://docs.docker.com/reference/cli/docker/container/logs/", summary: "애플리케이션의 표준 출력과 표준 오류를 확인하고 로그를 실시간으로 따라가는 방법입니다." },
  { id: "docker-dockerfile", title: "Docker 공식 문서 · Dockerfile 참조", url: "https://docs.docker.com/reference/dockerfile/", summary: "FROM, WORKDIR, COPY, RUN, CMD 등 이미지 작성 명령의 동작을 설명합니다." },
  { id: "docker-cache", title: "Docker 공식 문서 · 빌드 캐시", url: "https://docs.docker.com/build/cache/", summary: "변경된 레이어 이후의 빌드가 다시 실행되는 원리와 캐시 활용을 설명합니다." },
  { id: "docker-publish", title: "Docker 공식 문서 · 이미지 빌드와 배포", url: "https://docs.docker.com/get-started/docker-concepts/building-images/build-tag-and-publish-an-image/", summary: "이미지 빌드, 태그 지정, 레지스트리로의 푸시 과정을 안내합니다." },
  { id: "docker-network", title: "Docker 공식 문서 · 네트워크", url: "https://docs.docker.com/engine/network/", summary: "포트 공개와 사용자 정의 네트워크에서 컨테이너가 연결되는 방식을 설명합니다." },
  { id: "docker-volumes", title: "Docker 공식 문서 · 볼륨", url: "https://docs.docker.com/engine/storage/volumes/", summary: "컨테이너 수명과 분리된 데이터 저장, 이름 있는 볼륨과 마운트를 설명합니다." },
  { id: "docker-compose", title: "Docker 공식 문서 · Compose 시작하기", url: "https://docs.docker.com/compose/gettingstarted/", summary: "여러 서비스를 YAML로 정의하고 함께 실행하며 데이터를 유지하는 과정을 안내합니다." },
];

const draft: CurriculumDraft = {
  title: "Docker, 첫 컨테이너부터",
  description: "이미지와 컨테이너의 차이부터 직접 빌드하고 연결하는 방법까지. 짧은 9개 레슨으로 Docker의 기본 흐름을 익혀 보세요.",
  chapters: [
    {
      title: "컨테이너와 친해지기",
      description: "Docker가 필요한 이유를 이해하고, 첫 컨테이너를 실행하고 관찰합니다.",
      objectives: ["이미지와 컨테이너 구분하기", "컨테이너 실행과 상태 확인하기", "로그로 동작 이해하기"],
      lessons: [
        {
          title: "이미지와 컨테이너의 차이",
          objectives: ["컨테이너를 격리된 실행 환경으로 설명할 수 있다", "이미지와 컨테이너의 역할을 구분할 수 있다"],
          difficulty: "intro", estimatedMinutes: 5,
          keyConcepts: ["이미지 = 실행에 필요한 파일 묶음", "컨테이너 = 이미지로 만든 실행 환경", "하나의 이미지, 여러 컨테이너"],
          content: [
            { title: "내 컴퓨터에서만 되던 프로그램", body: "팀원마다 설치한 프로그램 버전이 다르면 같은 코드도 다르게 동작할 수 있습니다. 컨테이너는 프로그램과 필요한 파일을 격리된 환경에서 실행해 이런 차이를 줄입니다. 다만 호스트의 운영체제와 CPU 조건까지 모두 같아지는 것은 아닙니다." },
            { title: "레시피와 완성된 요리처럼", body: "이미지는 프로그램을 실행하는 데 필요한 파일과 설정을 담은 읽기 전용 틀입니다. 컨테이너는 그 이미지로 만든 실행 환경입니다. 한 이미지에서 여러 컨테이너를 만들 수 있고, 각 컨테이너는 별도의 쓰기 영역을 가집니다. 이미지가 같아도 실행 상태와 변경한 파일은 서로 다를 수 있습니다." },
            { title: "가상 머신과 무엇이 다를까요?", body: "가상 머신은 자체 운영체제 커널을 실행합니다. 컨테이너는 실행 환경을 격리하면서 커널을 공유합니다. 그래서 컨테이너마다 운영체제 전체를 새로 부팅할 필요가 없습니다. Docker Desktop은 필요에 따라 가상 머신 안에서 Linux 컨테이너를 실행합니다." },
          ],
          examples: [{ title: "같은 이미지에서 두 환경 만들기", explanation: "nginx:alpine이라는 같은 이미지로 web-a와 web-b를 만듭니다. 두 컨테이너의 이름과 실행 상태는 따로 관리됩니다. 이 예시는 Docker가 설치되어 실행 중인 환경에서 직접 실습할 수 있습니다.", code: "docker run -d --name web-a nginx:alpine\ndocker run -d --name web-b nginx:alpine\ndocker ps" }],
          sourceIds: ["docker-containers", "docker-images", "docker-run"],
          quiz: [
            { question: "같은 이미지로 컨테이너 두 개를 만들었습니다. 가장 정확한 설명은 무엇일까요?", options: ["두 컨테이너는 항상 같은 실행 상태를 가진다", "이미지는 공유할 수 있지만 실행 상태는 각각 관리된다", "두 번째 컨테이너가 첫 번째 이미지를 삭제한다", "컨테이너마다 이미지를 직접 수정해야 한다"], correctAnswerIndex: 1, explanation: "이미지는 재사용 가능한 틀이고, 컨테이너는 각각 별도의 실행 환경과 쓰기 영역을 가집니다." },
            { question: "동료와 실행 환경의 차이를 줄이려면 무엇을 공유하는 것이 적절할까요?", options: ["내 터미널의 글자 색", "내 컴퓨터의 모든 파일", "프로그램과 실행에 필요한 설정을 담은 이미지", "실행 중인 프로그램의 화면 캡처"], correctAnswerIndex: 2, explanation: "이미지는 프로그램 파일과 실행 설정을 묶어 같은 기반으로 컨테이너를 만들게 합니다." },
            { question: "컨테이너와 가상 머신의 기본 차이를 바르게 설명한 것은 무엇일까요?", options: ["컨테이너는 커널을 공유하고 가상 머신은 자체 커널을 실행한다", "컨테이너에는 어떤 파일도 저장할 수 없다", "가상 머신은 프로그램을 실행할 수 없다", "컨테이너는 반드시 하나만 실행할 수 있다"], correctAnswerIndex: 0, explanation: "컨테이너는 커널을 공유하는 격리된 환경이고, 가상 머신은 운영체제 커널을 포함한 환경을 실행합니다." },
          ],
        },
        {
          title: "첫 컨테이너 실행하기",
          objectives: ["docker run의 기본 구조를 읽을 수 있다", "백그라운드 실행과 컨테이너 이름의 의미를 설명할 수 있다"],
          difficulty: "intro", estimatedMinutes: 5,
          keyConcepts: ["docker run", "이미지 이름:태그", "-d 백그라운드 실행", "--name 컨테이너 이름"],
          content: [
            { title: "run은 만들고 실행하는 명령", body: "docker run [옵션] 이미지 [명령] 형식으로 새 컨테이너를 만듭니다. 이미지가 로컬에 없다면 기본적으로 레지스트리에서 내려받습니다. 이미지 이름 뒤의 태그는 사용할 이미지 버전을 나타냅니다. nginx:alpine에서 nginx는 이름, alpine은 태그입니다." },
            { title: "터미널을 계속 사용하려면", body: "-d는 컨테이너를 백그라운드에서 실행합니다. --name web은 컨테이너에 web이라는 이름을 붙입니다. 이름은 나중에 상태 확인이나 중지 명령에서 사용할 수 있습니다. 같은 이름의 컨테이너가 이미 존재하면 다른 이름을 사용하거나 기존 컨테이너를 정리해야 합니다." },
            { title: "실행 결과를 확인하기", body: "docker ps는 현재 실행 중인 컨테이너 목록을 보여 줍니다. docker ps -a는 종료된 컨테이너도 포함합니다. 프로그램이 작업을 마치고 종료했다면 컨테이너도 종료될 수 있습니다. 종료되었다고 곧바로 오류라고 판단하지 말고 실행한 작업과 로그를 확인하세요." },
          ],
          examples: [{ title: "웹 서버를 백그라운드로 실행", explanation: "Docker가 실행 중인지 확인한 뒤 명령을 입력합니다. web이라는 이름을 사용하므로 이후 docker logs web처럼 참조할 수 있습니다. 아직 호스트로 포트를 공개하지 않았으므로 브라우저 연결은 다음 챕터에서 다룹니다.", code: "docker run -d --name web nginx:alpine\ndocker ps\ndocker ps -a" }],
          sourceIds: ["docker-run", "docker-containers"],
          quiz: [
            { question: "docker run -d --name web nginx:alpine에서 -d는 무엇을 바꿀까요?", options: ["이미지를 삭제한다", "컨테이너에 디스크를 추가한다", "이미지를 다운로드하지 못하게 한다", "컨테이너를 백그라운드에서 실행한다"], correctAnswerIndex: 3, explanation: "-d 또는 --detach를 사용하면 컨테이너가 백그라운드에서 실행되어 터미널을 계속 사용할 수 있습니다." },
            { question: "작업을 마치고 종료한 컨테이너도 목록에서 확인하려면 어떤 명령을 사용할까요?", options: ["docker ps -a", "docker ps만 사용한다", "docker build -a", "docker images web"], correctAnswerIndex: 0, explanation: "docker ps -a는 실행 중인 컨테이너와 종료된 컨테이너를 함께 표시합니다." },
            { question: "nginx:alpine에서 alpine을 가장 알맞게 설명한 것은 무엇일까요?", options: ["실행할 컨테이너의 고유 ID", "이미지를 구분하는 태그", "호스트의 파일 경로", "반드시 공개해야 하는 포트"], correctAnswerIndex: 1, explanation: "콜론 뒤의 alpine은 이미지 태그입니다. 컨테이너 이름은 별도의 --name 옵션으로 설정합니다." },
          ],
        },
        {
          title: "상태와 로그로 문제 찾기",
          objectives: ["중지와 삭제의 차이를 이해할 수 있다", "로그를 확인해 컨테이너 동작을 관찰할 수 있다"],
          difficulty: "intro", estimatedMinutes: 6,
          keyConcepts: ["docker stop / start", "docker rm", "docker logs", "표준 출력과 표준 오류"],
          content: [
            { title: "중지와 삭제는 다릅니다", body: "docker stop web은 실행을 멈추지만 컨테이너는 남겨 둡니다. docker start web으로 그 컨테이너를 다시 시작할 수 있습니다. docker rm web은 중지된 컨테이너 자체를 제거합니다. 삭제 뒤에는 같은 컨테이너를 start할 수 없으므로 새로 만들어야 합니다." },
            { title: "프로그램이 말해 주는 로그", body: "docker logs web은 컨테이너의 표준 출력과 표준 오류를 확인하는 명령입니다. --tail 20은 최근 20줄만 보여 주고, -f는 새 로그를 계속 따라갑니다. 컨테이너 안의 모든 파일을 읽는 명령은 아니므로 애플리케이션이 파일에만 기록한다면 별도 확인이 필요합니다." },
            { title: "당황하지 않고 확인하는 순서", body: "화면이 열리지 않을 때 먼저 docker ps -a로 상태를 확인합니다. 종료되었다면 로그에서 이유를 찾습니다. 실행 중이라면 애플리케이션이 어느 포트에서 대기하는지와 포트 설정을 확인합니다. 컨테이너의 실행 상태와 서비스의 정상 응답은 서로 다른 확인 항목입니다." },
          ],
          examples: [{ title: "관찰한 뒤 다시 시작하기", explanation: "앞 레슨의 web 컨테이너가 있어야 합니다. 최근 로그를 읽고 중지한 다음, 종료 상태를 확인하고 같은 컨테이너를 다시 시작합니다. 마지막 삭제 명령은 실습을 끝낼 때 중지한 컨테이너에 사용할 수 있습니다.", code: "docker logs --tail 20 web\ndocker stop web\ndocker ps -a\ndocker start web" }],
          sourceIds: ["docker-logs", "docker-run"],
          quiz: [
            { question: "컨테이너를 잠시 멈췄다가 같은 컨테이너를 다시 실행하려면 어떤 흐름이 적절할까요?", options: ["docker rm 후 docker start", "docker build 후 docker push", "docker stop 후 docker start", "docker logs 후 docker images"], correctAnswerIndex: 2, explanation: "stop은 컨테이너를 남긴 채 실행을 멈춥니다. 남아 있는 컨테이너는 start로 다시 실행할 수 있습니다." },
            { question: "docker logs --tail 20 web으로 확인하는 것은 무엇일까요?", options: ["호스트의 모든 시스템 파일", "이미지의 모든 이전 버전", "web 컨테이너의 전체 디스크 목록", "web 컨테이너의 최근 표준 출력·오류 로그"], correctAnswerIndex: 3, explanation: "docker logs는 표준 출력과 표준 오류를 보여 줍니다. --tail 20은 최근 20줄로 범위를 제한합니다." },
            { question: "docker ps에 컨테이너가 보이는데 서비스가 응답하지 않습니다. 다음 확인으로 가장 적절한 것은?", options: ["로그와 애플리케이션의 대기 포트, 포트 공개 설정을 확인한다", "실행 중이므로 반드시 정상이라고 판단한다", "컴퓨터의 모든 이미지를 삭제한다", "컨테이너 이름만 바꾸면 해결된다고 판단한다"], correctAnswerIndex: 0, explanation: "컨테이너가 실행 중이라는 사실만으로 서비스 응답을 보장하지 않습니다. 로그와 연결 설정을 함께 살펴봅니다." },
          ],
        },
      ],
    },
    {
      title: "내 이미지 만들기",
      description: "Dockerfile로 실행 환경을 정의하고, 빌드와 캐시, 이미지 배포의 흐름을 익힙니다.",
      objectives: ["Dockerfile의 핵심 명령 구분하기", "빌드와 캐시의 관계 이해하기", "태그와 레지스트리로 이미지 공유하기"],
      lessons: [
        {
          title: "Dockerfile로 실행 환경 정의하기",
          objectives: ["Dockerfile의 기본 명령을 해석할 수 있다", "빌드 시점과 실행 시점을 구분할 수 있다"],
          difficulty: "beginner", estimatedMinutes: 7,
          keyConcepts: ["FROM 기반 이미지", "WORKDIR 작업 경로", "COPY 파일 복사", "RUN 빌드 / CMD 실행"],
          content: [
            { title: "이미지를 만드는 설명서", body: "Dockerfile은 이미지를 만드는 명령을 순서대로 적은 파일입니다. FROM은 기반 이미지를 선택하고, WORKDIR는 이후 명령의 작업 디렉터리를 지정합니다. COPY는 빌드에 제공한 파일을 이미지 안으로 복사합니다. 아래 예시에서는 프로젝트 폴더에 app.py라는 파일을 준비합니다." },
            { title: "RUN과 CMD의 두 시점", body: "RUN은 이미지를 만드는 빌드 단계에서 명령을 실행합니다. 의존성을 설치하거나 디렉터리를 준비할 때 사용합니다. CMD는 이미지로 컨테이너를 실행할 때 사용할 기본 명령입니다. Dockerfile에 CMD를 적었다고 빌드 중에 애플리케이션이 실행되는 것은 아닙니다." },
          ],
          examples: [{ title: "작은 Python 프로그램의 이미지", explanation: "app.py에 print('Hello, container!')를 작성한 뒤 같은 폴더에 아래 Dockerfile을 저장합니다. 기반 이미지의 Python을 사용하고 파일을 /app에 복사한 후, 컨테이너 시작 시 app.py를 실행합니다.", code: "FROM python:3.12-slim\nWORKDIR /app\nCOPY app.py .\nCMD [\"python\", \"app.py\"]" }],
          sourceIds: ["docker-dockerfile"],
          quiz: [
            { question: "이미지를 만들 때 의존성을 설치하고 싶습니다. 가장 적합한 Dockerfile 명령은?", options: ["CMD", "RUN", "EXPOSE만 사용", "docker ps"], correctAnswerIndex: 1, explanation: "RUN은 빌드 시점에 명령을 실행합니다. CMD는 컨테이너 시작 시의 기본 실행 명령을 지정합니다." },
            { question: "WORKDIR /app 다음에 COPY app.py .를 작성하면 파일은 어디로 복사될까요?", options: ["호스트의 바탕화면", "레지스트리의 루트", "이미지 안의 /app 디렉터리", "Dockerfile 밖의 임의 디렉터리"], correctAnswerIndex: 2, explanation: "WORKDIR가 작업 경로를 /app으로 설정하므로 상대 경로 .는 이미지 안의 /app을 가리킵니다." },
            { question: "CMD [\"python\", \"app.py\"]를 가장 정확하게 설명한 것은 무엇일까요?", options: ["빌드 중 Python을 설치하는 명령이다", "이미지의 이름을 바꾼다", "호스트의 app.py를 삭제한다", "컨테이너 시작 시 사용할 기본 명령을 지정한다"], correctAnswerIndex: 3, explanation: "CMD는 이미지로 만든 컨테이너가 시작할 때 사용할 기본 명령입니다." },
          ],
        },
        {
          title: "빌드와 캐시 이해하기",
          objectives: ["docker build 명령의 태그와 컨텍스트를 구분할 수 있다", "캐시를 활용하는 파일 복사 순서를 설명할 수 있다"],
          difficulty: "beginner", estimatedMinutes: 6,
          keyConcepts: ["docker build -t", "빌드 컨텍스트", "레이어 캐시", "변경이 적은 단계 먼저"],
          content: [
            { title: "설명서를 이미지로 바꾸기", body: "Dockerfile이 있는 폴더에서 docker build -t my-app:1.0 .를 실행합니다. -t는 생성할 이미지의 이름과 태그를 지정합니다. 마지막 .은 현재 폴더를 빌드 컨텍스트로 전달한다는 뜻입니다. COPY에 사용할 파일은 이 컨텍스트 안에 있어야 합니다." },
            { title: "매번 처음부터 만들 필요는 없습니다", body: "Docker는 이전 빌드 결과를 재사용하는 캐시를 활용합니다. 한 단계의 입력이 바뀌어 캐시를 재사용할 수 없으면, 그 뒤에 이어지는 단계도 다시 실행됩니다. 자주 바뀌는 소스 코드를 의존성 설치보다 먼저 복사하면 코드 변경 때 의존성 설치까지 다시 수행하게 됩니다." },
            { title: "잘 바뀌지 않는 파일부터", body: "requirements.txt를 먼저 복사하고 의존성을 설치한 다음 app.py를 복사해 보세요. app.py만 바뀌면 앞의 의존성 설치 단계는 캐시를 재사용할 수 있습니다. 캐시는 결과가 항상 최신인지 판단해 주는 기능이 아니라, 입력과 빌드 단계에 따라 이전 결과를 재사용하는 기능입니다." },
          ],
          examples: [{ title: "의존성과 소스 코드의 단계 나누기", explanation: "app.py와 requirements.txt를 준비한 폴더에서 이 Dockerfile을 빌드합니다. 외부 패키지가 없다면 requirements.txt는 빈 파일이어도 됩니다. 코드만 바꾼 뒤 다시 빌드해 앞 단계가 재사용되는지 로그를 관찰해 보세요.", code: "FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY app.py .\nCMD [\"python\", \"app.py\"]\n\n# 터미널에서 실행\n# docker build -t my-app:1.0 ." }],
          sourceIds: ["docker-cache", "docker-dockerfile", "docker-publish"],
          quiz: [
            { question: "docker build -t my-app:1.0 .에서 마지막 .의 의미는 무엇일까요?", options: ["현재 폴더를 빌드 컨텍스트로 사용한다", "모든 컨테이너를 시작한다", "이미지를 즉시 외부에 공개한다", "캐시를 전부 삭제한다"], correctAnswerIndex: 0, explanation: "마지막 인자는 빌드 컨텍스트입니다. .은 현재 폴더를 가리키며 COPY가 사용할 파일을 제공합니다." },
            { question: "app.py는 자주 바뀌고 requirements.txt는 거의 바뀌지 않습니다. 캐시를 활용하려면?", options: ["app.py를 먼저 복사하고 의존성을 설치한다", "두 파일을 절대 복사하지 않는다", "의존성 파일 복사와 설치를 먼저 하고 소스 코드를 나중에 복사한다", "CMD로만 의존성을 빌드한다"], correctAnswerIndex: 2, explanation: "변경이 적은 의존성 단계가 앞에 있으면 소스 코드 변경이 그 단계의 캐시를 무효화하지 않습니다." },
            { question: "중간 COPY 단계의 입력 파일이 바뀌었습니다. 일반적으로 이후 빌드 단계에는 어떤 영향이 있을까요?", options: ["이후 단계는 어떤 경우에도 재실행되지 않는다", "해당 단계와 뒤의 단계가 다시 실행된다", "실행 중인 모든 컨테이너가 자동 삭제된다", "이미지를 빌드할 수 없게 된다"], correctAnswerIndex: 1, explanation: "변경된 레이어에서 캐시가 무효화되면 그 뒤의 단계들도 다시 빌드됩니다." },
          ],
        },
        {
          title: "태그와 레지스트리로 공유하기",
          objectives: ["이미지 태그와 레지스트리의 역할을 구분할 수 있다", "빌드·태그·푸시·풀의 순서를 이해할 수 있다"],
          difficulty: "beginner", estimatedMinutes: 5,
          keyConcepts: ["이미지 태그", "레지스트리", "docker push / pull", "latest는 태그 이름"],
          content: [
            { title: "태그는 이미지에 붙이는 이름표", body: "my-app:1.0의 1.0은 태그입니다. 태그를 붙여 버전을 구분할 수 있지만, 같은 태그를 다른 이미지로 다시 지정할 수도 있습니다. latest라는 태그가 항상 가장 최근에 출시된 버전을 뜻하는 것은 아닙니다. 공유할 버전의 태그를 팀과 명확하게 약속하세요." },
            { title: "레지스트리는 이미지를 보관하는 곳", body: "docker push는 로컬 이미지를 레지스트리에 올리고, docker pull은 내려받습니다. Docker Hub에 올릴 때는 계정명/이미지명:태그 형식으로 이름을 지정하고 로그인해야 합니다. 이미지를 올리는 행위와 컨테이너를 실행하는 행위는 서로 다릅니다." },
          ],
          examples: [{ title: "이미지를 팀원과 공유하는 흐름", explanation: "이 명령은 Docker Hub 계정과 해당 저장소의 권한이 있을 때 사용하는 예시입니다. YOUR_USERNAME을 본인 계정명으로 바꿉니다. 로컬 학습만 진행한다면 실제 push 없이 명령의 순서만 확인해도 됩니다.", code: "docker tag my-app:1.0 YOUR_USERNAME/my-app:1.0\ndocker login\ndocker push YOUR_USERNAME/my-app:1.0\n# 다른 환경에서는\ndocker pull YOUR_USERNAME/my-app:1.0" }],
          sourceIds: ["docker-publish", "docker-run"],
          quiz: [
            { question: "팀원에게 로컬 이미지를 레지스트리로 공유하는 명령은 무엇일까요?", options: ["docker stop", "docker logs", "docker ps", "docker push"], correctAnswerIndex: 3, explanation: "push는 이미지를 레지스트리에 업로드합니다. 팀원은 pull로 같은 이미지를 내려받을 수 있습니다." },
            { question: "latest 태그에 대해 가장 정확한 설명은 무엇일까요?", options: ["태그 이름이며 최신 출시 버전이라고 자동 보장되지는 않는다", "항상 시간상 가장 최근 버전이다", "컨테이너의 현재 실행 상태이다", "이미지를 수정할 수 없게 하는 비밀번호이다"], correctAnswerIndex: 0, explanation: "latest도 태그 이름 중 하나입니다. 배포자가 무엇을 가리키게 지정했는지에 따라 실제 이미지가 결정됩니다." },
            { question: "docker push가 성공했습니다. 이제 어떤 상태일까요?", options: ["팀원의 컴퓨터에서 자동으로 서비스가 실행된다", "이미지가 레지스트리에 저장되어 내려받을 수 있다", "로컬 컨테이너가 모두 종료된다", "이미지 안의 파일이 전부 삭제된다"], correctAnswerIndex: 1, explanation: "push는 이미지를 올리는 단계입니다. 서비스를 실행하려면 그 이미지로 별도의 컨테이너를 시작해야 합니다." },
          ],
        },
      ],
    },
    {
      title: "연결하고 데이터 지키기",
      description: "포트와 네트워크, 볼륨을 이해하고 Compose로 여러 서비스를 함께 관리합니다.",
      objectives: ["호스트와 컨테이너의 연결 구분하기", "컨테이너 삭제 뒤에도 데이터 보존하기", "Compose 설정으로 실행 흐름 묶기"],
      lessons: [
        {
          title: "포트와 컨테이너 네트워크",
          objectives: ["포트 공개의 두 숫자를 해석할 수 있다", "사용자 정의 네트워크의 이름 기반 연결을 이해할 수 있다"],
          difficulty: "beginner", estimatedMinutes: 7,
          keyConcepts: ["호스트 포트:컨테이너 포트", "-p 포트 공개", "사용자 정의 네트워크", "컨테이너 이름으로 연결"],
          content: [
            { title: "브라우저에서 컨테이너로 들어가기", body: "컨테이너의 포트와 호스트의 포트는 별개입니다. -p 127.0.0.1:8080:80은 호스트의 127.0.0.1 주소에서 8080 포트로 들어온 연결을 컨테이너의 80 포트로 보냅니다. 이 설정이면 같은 컴퓨터의 브라우저에서 http://localhost:8080으로 접속합니다." },
            { title: "컨테이너끼리는 네트워크로 연결", body: "docker network create로 사용자 정의 네트워크를 만들고 --network로 컨테이너를 참여시킵니다. 같은 사용자 정의 네트워크의 컨테이너는 컨테이너 이름을 호스트 이름으로 사용해 연결할 수 있습니다. 컨테이너 내부의 localhost는 기본적으로 그 컨테이너 자신이므로 다른 컨테이너를 가리키지 않습니다." },
          ],
          examples: [{ title: "로컬 브라우저와 다른 컨테이너에서 연결", explanation: "앞의 web 컨테이너가 있다면 이름이 겹치지 않도록 web-network를 사용합니다. 브라우저는 localhost:8080에 접속하고, 같은 학습 네트워크의 다른 컨테이너는 web-network:80으로 연결할 수 있습니다.", code: "docker network create study-net\ndocker run -d --name web-network --network study-net -p 127.0.0.1:8080:80 nginx:alpine" }],
          sourceIds: ["docker-network", "docker-run"],
          quiz: [
            { question: "-p 127.0.0.1:8080:80으로 실행한 웹 서버에 같은 컴퓨터의 브라우저로 접속하려면?", options: ["http://localhost:80만 사용한다", "http://localhost:8080을 사용한다", "http://localhost:808080을 사용한다", "이미지 이름을 브라우저 주소에 입력한다"], correctAnswerIndex: 1, explanation: "호스트에서 사용하는 포트는 8080이고, Docker가 컨테이너의 80 포트로 연결을 전달합니다." },
            { question: "같은 사용자 정의 네트워크의 API 컨테이너가 db 컨테이너에 연결할 때 사용할 수 있는 이름은?", options: ["항상 localhost만 가능하다", "Dockerfile 파일 이름", "db라는 컨테이너 이름", "docker ps 명령 문자열"], correctAnswerIndex: 2, explanation: "사용자 정의 네트워크에서는 컨테이너 이름을 DNS 호스트 이름으로 사용해 서로 연결할 수 있습니다." },
            { question: "일반적인 컨테이너 안에서 localhost가 가리키는 대상은 무엇일까요?", options: ["그 컨테이너 자신", "언제나 호스트 컴퓨터", "모든 컨테이너를 동시에 가리킨다", "Docker Hub 레지스트리"], correctAnswerIndex: 0, explanation: "격리된 네트워크 환경에서 localhost는 해당 컨테이너 자신입니다. 다른 컨테이너에는 네트워크 이름 등을 사용합니다." },
          ],
        },
        {
          title: "볼륨으로 데이터 유지하기",
          objectives: ["컨테이너 쓰기 영역과 볼륨의 수명을 구분할 수 있다", "이름 있는 볼륨의 source와 target을 설명할 수 있다"],
          difficulty: "beginner", estimatedMinutes: 6,
          keyConcepts: ["컨테이너 쓰기 영역", "이름 있는 볼륨", "source와 target", "데이터와 실행 환경 분리"],
          content: [
            { title: "컨테이너는 다시 만들 수 있습니다", body: "컨테이너의 일반 쓰기 영역에 저장한 데이터는 컨테이너를 제거하면 함께 사라집니다. 단순히 중지하는 것과 삭제하는 것은 다릅니다. 컨테이너를 교체해도 유지해야 하는 데이터는 실행 환경과 분리해서 보관해야 합니다." },
            { title: "이름 있는 볼륨을 연결하기", body: "볼륨은 Docker가 관리하는 저장 공간입니다. --mount type=volume,source=study-data,target=/data는 study-data 볼륨을 컨테이너의 /data에 연결합니다. source는 볼륨 이름, target은 컨테이너 내부 경로입니다. 이름 있는 볼륨은 컨테이너를 제거해도 남고, 같은 볼륨을 새 컨테이너에 연결하면 데이터를 다시 읽을 수 있습니다." },
            { title: "무엇을 남기고 무엇을 바꿀까요?", body: "프로그램을 새 이미지로 교체하더라도 데이터는 볼륨에 유지할 수 있습니다. 다만 볼륨 자체를 삭제하면 저장한 데이터도 사라집니다. 영속 저장은 백업과 같지 않으므로 중요한 데이터는 별도 백업 방법도 고려해야 합니다." },
          ],
          examples: [{ title: "컨테이너가 바뀌어도 남는 메모", explanation: "첫 컨테이너가 /data에 파일을 쓰고 종료되면 --rm이 그 컨테이너를 제거합니다. 두 번째 컨테이너는 같은 이름 있는 볼륨을 연결해서 hello.txt를 읽습니다. 셸의 >가 컨테이너 안에서 실행되도록 sh -c 인자 안에 넣었습니다.", code: "docker volume create study-data\ndocker run --rm --mount type=volume,source=study-data,target=/data alpine sh -c 'echo hello > /data/hello.txt'\ndocker run --rm --mount type=volume,source=study-data,target=/data alpine cat /data/hello.txt" }],
          sourceIds: ["docker-volumes", "docker-run"],
          quiz: [
            { question: "볼륨을 사용하지 않고 컨테이너의 쓰기 영역에 메모를 저장했습니다. 컨테이너를 삭제하면?", options: ["Docker Hub에 자동으로 백업된다", "호스트 바탕화면으로 이동한다", "다음 이미지에 자동으로 포함된다", "해당 컨테이너의 쓰기 영역과 함께 사라진다"], correctAnswerIndex: 3, explanation: "컨테이너의 쓰기 영역은 컨테이너 수명에 묶여 있습니다. 삭제 후에도 유지할 데이터에는 볼륨 등을 사용합니다." },
            { question: "source=study-data,target=/data에서 /data는 무엇일까요?", options: ["볼륨을 연결할 컨테이너 내부 경로", "레지스트리 계정명", "호스트의 공개 포트", "이미지의 버전 태그"], correctAnswerIndex: 0, explanation: "target은 컨테이너 내부에서 볼륨이 연결될 경로입니다. source는 사용할 볼륨의 이름입니다." },
            { question: "기존 컨테이너를 지운 뒤 같은 데이터를 새 컨테이너에서 읽고 싶습니다. 가장 적절한 방법은?", options: ["컨테이너 이름만 동일하게 정한다", "남아 있는 같은 이름의 볼륨을 새 컨테이너에 연결한다", "docker ps를 여러 번 실행한다", "이미지 태그를 latest로 바꾼다"], correctAnswerIndex: 1, explanation: "이름 있는 볼륨은 컨테이너와 별도로 유지됩니다. 같은 볼륨을 연결하면 저장된 데이터에 다시 접근할 수 있습니다." },
          ],
        },
        {
          title: "Compose로 서비스 함께 실행하기",
          objectives: ["Compose 설정의 services와 volumes를 읽을 수 있다", "시작·종료·데이터 삭제의 차이를 이해할 수 있다"],
          difficulty: "beginner", estimatedMinutes: 8,
          keyConcepts: ["compose.yaml", "services", "docker compose up / down", "이름 있는 볼륨 유지"],
          content: [
            { title: "여러 실행 명령을 설정 파일로", body: "애플리케이션과 데이터 저장소를 함께 사용하면 실행 옵션을 일일이 기억하기 어렵습니다. Compose는 compose.yaml에 서비스의 이미지, 포트, 볼륨 등의 설정을 적고 함께 관리하게 합니다. services 아래의 web과 redis는 각각 하나의 서비스 이름입니다." },
            { title: "같이 시작하고 상태 확인하기", body: "설정 파일이 있는 폴더에서 docker compose up -d를 실행하면 서비스를 백그라운드에서 시작합니다. docker compose ps로 상태를 보고 docker compose logs로 로그를 확인합니다. 기본 네트워크에 참여한 서비스는 다른 서비스 이름으로 연결할 수 있습니다. 함께 실행되었다고 데이터 저장소가 즉시 준비되었다는 뜻은 아닙니다." },
            { title: "종료할 때 데이터의 수명도 생각하기", body: "docker compose down은 프로젝트의 컨테이너와 네트워크를 제거합니다. 이름 있는 볼륨은 기본적으로 남습니다. down -v는 선언한 이름 있는 볼륨까지 제거하므로 저장 데이터가 필요할 때 사용하면 안 됩니다. 실행 환경을 다시 만드는 일과 데이터를 지우는 일을 구분하세요." },
          ],
          examples: [{ title: "웹 서버와 저장소를 한 파일에", explanation: "compose.yaml에 저장한 뒤 docker compose up -d로 실행합니다. web은 호스트의 8081에서 확인할 수 있고 redis 데이터는 redis-data 볼륨에 보관합니다. 이 예시는 두 서비스를 함께 관리하는 구조이며 nginx가 Redis를 직접 사용하는 애플리케이션 예시는 아닙니다.", code: "services:\n  web:\n    image: nginx:alpine\n    ports:\n      - \"127.0.0.1:8081:80\"\n  redis:\n    image: redis:7-alpine\n    command: [\"redis-server\", \"--appendonly\", \"yes\"]\n    volumes:\n      - redis-data:/data\nvolumes:\n  redis-data:" }],
          sourceIds: ["docker-compose", "docker-network", "docker-volumes"],
          quiz: [
            { question: "Compose 설정에 있는 여러 서비스를 백그라운드로 실행하려면 어떤 명령을 사용할까요?", options: ["docker compose logs", "docker compose down -v", "docker compose up -d", "docker tag compose.yaml"], correctAnswerIndex: 2, explanation: "docker compose up -d는 설정된 서비스를 만들고 백그라운드에서 실행합니다." },
            { question: "컨테이너는 다시 만들되 이름 있는 볼륨의 데이터를 남기려면 어떤 종료 명령이 적절할까요?", options: ["docker compose down -v", "docker volume rm redis-data", "docker rm이 언제나 모든 볼륨을 지운다", "docker compose down"], correctAnswerIndex: 3, explanation: "down은 기본적으로 이름 있는 볼륨을 유지합니다. -v 옵션을 붙이면 선언한 이름 있는 볼륨도 제거합니다." },
            { question: "Compose로 API와 데이터 저장소를 동시에 시작했습니다. 연결 실패를 줄이려면 어떤 점을 고려해야 할까요?", options: ["컨테이너 시작과 서비스 준비 완료는 다르므로 준비 상태를 확인한다", "동시에 시작하면 항상 즉시 연결할 수 있다", "서비스 이름은 절대 연결에 사용할 수 없다", "모든 볼륨을 삭제하면 준비 상태가 보장된다"], correctAnswerIndex: 0, explanation: "실행 중인 컨테이너에서도 서비스 초기화가 끝나지 않았을 수 있습니다. 준비 상태 확인과 연결 재시도를 고려합니다." },
          ],
        },
      ],
    },
  ],
};

export function createDemoCourse(): Course {
  return materializeCourse(draft, {
    id: "docker-demo",
    topic: "Docker 기초 배우기",
    level: "intro",
    sources,
    mode: "demo",
  });
}
