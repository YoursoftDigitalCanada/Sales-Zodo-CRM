// ...existing code...
#include <bits/stdc++.h>
using namespace std;

struct P { double x,y; };
double cross(const P &a,const P &b){ return a.x*b.y - a.y*b.x; }
P operator-(const P&a,const P&b){ return {a.x-b.x, a.y-b.y}; }
P operator+(const P&a,const P&b){ return {a.x+b.x, a.y+b.y}; }
P operator*(const P&a,double s){ return {a.x*s, a.y*s}; }
double dot(const P&a,const P&b){ return a.x*b.x + a.y*b.y; }
double len(const P&a){ return hypot(a.x,a.y); }

double polygonArea(const vector<P>&poly){
    double a=0;
    int n=poly.size();
    for(int i=0;i<n;i++){
        int j=(i+1)%n;
        a += cross(poly[i], poly[j]);
    }
    return fabs(a)*0.5;
}

// Clip polygon by half-plane dot(u,pt) >= c
vector<P> clipHalfplane(const vector<P>&poly, const P&u, double c){
    const double EPS = 1e-9;
    vector<P> out;
    int n = poly.size();
    if(n==0) return out;
    for(int i=0;i<n;i++){
        P A = poly[i], B = poly[(i+1)%n];
        double da = dot(u,A) - c;
        double db = dot(u,B) - c;
        bool ina = (da >= -EPS), inb = (db >= -EPS);
        if(ina) out.push_back(A);
        if( (ina && !inb) || (!ina && inb) ){
            double denom = (da - db);
            if(fabs(denom) > 1e-15){
                double t = da / denom; // intersection param along A->B
                // clamp t just in case
                if(t < -1e-12) t = 0;
                if(t > 1+1e-12) t = 1;
                P I = A + (B - A) * t;
                out.push_back(I);
            }
        }
    }
    // remove near-duplicate consecutive points
    vector<P> res;
    for(auto &pt: out){
        if(res.empty() || hypot(res.back().x-pt.x, res.back().y-pt.y) > 1e-9) res.push_back(pt);
    }
    if(res.size()>=2 && hypot(res.front().x-res.back().x, res.front().y-res.back().y) < 1e-9) res.pop_back();
    return res;
}

int main(){
    ios::sync_with_stdio(false);
    cin.tie(NULL);

    int N;
    if(!(cin>>N)) return 0;
    vector<P> poly(N);
    for(int i=0;i<N;i++){
        cin >> poly[i].x >> poly[i].y;
    }
    // ensure polygon is CCW
    double signedA = 0;
    for(int i=0;i<N;i++){
        int j=(i+1)%N;
        signedA += cross(poly[i], poly[j]);
    }
    if(signedA < 0) reverse(poly.begin(), poly.end());

    double bestV = 0.0;
    double bestH = 0.0;
    double bestArea = 0.0;
    const double MAXH = 25.0; // coordinates constrained to <=25
    const double EPS = 1e-9;

    int maxK = (int)round(MAXH * 10.0);
    for(int k=1;k<=maxK;k++){ // H = 0.1, 0.2, ...
        double H = k * 0.1;
        vector<P> cur = poly;
        // clip by each inward half-plane
        for(int i=0;i<N && !cur.empty(); ++i){
            P A = poly[i], B = poly[(i+1)%N];
            P e = B - A;
            // inward normal for CCW polygon: (-e.y, e.x)
            P n = {-e.y, e.x};
            double nlen = len(n);
            if(nlen < EPS) continue;
            P u = { n.x / nlen, n.y / nlen }; // unit inward normal
            double c = dot(u, A) + H;
            cur = clipHalfplane(cur, u, c);
        }
        if(cur.size() < 3) continue;
        // check minimum edge length >= 0.1
        double minEdge = 1e18;
        for(size_t i=0;i<cur.size();++i){
            size_t j=(i+1)%cur.size();
            double d = hypot(cur[i].x-cur[j].x, cur[i].y-cur[j].y);
            minEdge = min(minEdge, d);
        }
        if(minEdge + 1e-9 < 0.1) continue;
        double area = polygonArea(cur);
        double vol = area * H;
        if(vol > bestV + 1e-12){
            bestV = vol;
            bestH = H;
            bestArea = area;
        }
    }

    cout.setf(std::ios::fixed);
    cout<<setprecision(2)<<bestV<<"\n";
    // Debug info (sent to stderr) showing H and area that produced max
    cerr.setf(std::ios::fixed);
    cerr<<setprecision(2)<<"bestH="<<bestH<<" bestArea="<<bestArea<<"\n";
    return 0;
}
// ...existing code...