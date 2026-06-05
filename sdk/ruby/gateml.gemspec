Gem::Specification.new do |spec|
  spec.name          = "gateml"
  spec.version       = "0.1.0"
  spec.summary       = "GateML Ruby SDK — route LLM calls through the GateML gateway"
  spec.description   = "Drop-in wrapper around ruby-openai that points requests at api.gateml.io"
  spec.homepage      = "https://gateml.io"
  spec.license       = "MIT"
  spec.authors       = ["GateML"]
  spec.files         = Dir["lib/**/*.rb"]
  spec.require_paths = ["lib"]

  spec.add_dependency "ruby-openai", ">= 7.0"
end
