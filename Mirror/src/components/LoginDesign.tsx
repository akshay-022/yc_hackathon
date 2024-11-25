function LoginDesign() {
    return (
      <div className="w-[60%] flex flex-col justify-center items-center p-16 bg-black-primary">
        <div className="w-full max-w-3xl text-center space-y-12">
          {/* Logo and Title */}
          <div className="space-y-6">
            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-5xl font-bold text-white">M</span>
            </div>
            <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
              Mirror AI
            </h1>
            <p className="text-3xl text-gray-400 leading-relaxed">
              Your AI consciousness
            </p>
          </div>
          
          {/* Feature List */}
          <div className="mt-16 space-y-8 text-center max-w-2xl mx-auto">
            <p className="text-2xl bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent font-medium">
              Authenticate with real accounts
            </p>
            <p className="text-2xl bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent font-medium">
              Let your friends talk to you
            </p>
            <p className="text-2xl bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent font-medium">
              Have full control over your data
            </p>
          </div>

        </div>
      </div>
    );
  }
  
  
  export default LoginDesign;